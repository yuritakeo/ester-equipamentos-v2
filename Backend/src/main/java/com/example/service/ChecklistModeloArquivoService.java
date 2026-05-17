package com.example.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.example.entity.ChecklistModelo;
import com.example.exception.BusinessException;
import com.example.exception.ResourceNotFoundException;
import com.example.repository.ChecklistModeloRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ChecklistModeloArquivoService {

    private static final DateTimeFormatter FILE_TIMESTAMP = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final Logger log = LoggerFactory.getLogger(ChecklistModeloArquivoService.class);

    private final ChecklistModeloRepository repository;

    @Transactional
    public ChecklistModelo importar(String nome, MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new BusinessException("Selecione um arquivo de modelo para importar.");
        }

        String nomeOriginal = arquivo.getOriginalFilename();
        if (nomeOriginal == null || nomeOriginal.isBlank()) {
            throw new BusinessException("Arquivo de modelo invalido.");
        }

        Path diretorio = obterDiretorioModelos();
        String extensao = obterExtensao(nomeOriginal);
        String arquivoSalvo = gerarNomeArquivo(nomeOriginal, extensao);
        Path destino = diretorio.resolve(arquivoSalvo);
        try (InputStream inputStream = arquivo.getInputStream()) {
            Files.createDirectories(diretorio);
            Files.copy(inputStream, destino, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new BusinessException("Nao foi possivel salvar o arquivo do modelo.");
        }

        ChecklistModelo checklistModelo = ChecklistModelo.builder()
                .nome((nome == null || nome.isBlank()) ? removerExtensao(nomeOriginal) : nome.trim())
                .arquivoNome(arquivoSalvo)
                .arquivoOriginalNome(nomeOriginal)
                .arquivoCaminho(destino.toString())
                .equipamentos(new ArrayList<>())
                .build();

        return repository.save(checklistModelo);
    }

    @Transactional
    public ChecklistModelo atualizarArquivo(ChecklistModelo checklistModelo, MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new BusinessException("Selecione um arquivo de modelo para reanexar.");
        }

        String nomeOriginal = arquivo.getOriginalFilename();
        if (nomeOriginal == null || nomeOriginal.isBlank()) {
            throw new BusinessException("Arquivo de modelo invalido.");
        }

        Optional<Path> caminhoAnterior = resolverCaminhoArquivo(checklistModelo);

        Path diretorio = obterDiretorioModelos();
        String extensao = obterExtensao(nomeOriginal);
        String arquivoSalvo = gerarNomeArquivo(nomeOriginal, extensao);
        Path destino = diretorio.resolve(arquivoSalvo);
        try (InputStream inputStream = arquivo.getInputStream()) {
            Files.createDirectories(diretorio);
            Files.copy(inputStream, destino, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new BusinessException("Nao foi possivel salvar o arquivo do modelo.");
        }

        apagarArquivoSeExistir(caminhoAnterior, false);

        checklistModelo.setArquivoNome(arquivoSalvo);
        checklistModelo.setArquivoOriginalNome(nomeOriginal);
        checklistModelo.setArquivoCaminho(destino.toString());

        return repository.save(checklistModelo);
    }

    public void excluirArquivoSeExistir(ChecklistModelo checklistModelo) {
        apagarArquivoSeExistir(resolverCaminhoArquivo(checklistModelo), true);
    }

    public Resource baixarArquivo(ChecklistModelo checklistModelo) {
        Optional<Path> caminho = resolverCaminhoArquivo(checklistModelo);
        if (caminho.isPresent()) {
            return new FileSystemResource(caminho.get());
        }

        byte[] conteudoArquivo = checklistModelo.getArquivoConteudo();
        if (conteudoArquivo != null && conteudoArquivo.length > 0) {
            return new ByteArrayResource(conteudoArquivo);
        }

        throw new ResourceNotFoundException("Arquivo do modelo nao encontrado");
    }

    @Transactional
    public void preencherConteudoArquivoAusente() {
        if (!Boolean.parseBoolean(System.getenv("CHECKLIST_SYNC_ARQUIVO_CONTEUDO_ON_STARTUP"))) {
            log.info("Sincronizacao de arquivo_conteudo desativada para preservar memoria do backend.");
            return;
        }

        int pagina = 0;
        int tamanho = 50;

        while (true) {
            Page<ChecklistModelo> page = repository.findAll(PageRequest.of(pagina, tamanho));

            if (page.isEmpty()) {
                break;
            }

            for (ChecklistModelo modelo : page.getContent()) {

                byte[] conteudoAtual = modelo.getArquivoConteudo();
                if (conteudoAtual != null && conteudoAtual.length > 0) {
                    continue;
                }

                Optional<Path> caminho = resolverCaminhoArquivo(modelo);
                if (caminho.isEmpty()) {
                    continue;
                }

                try {
                    byte[] bytes = Files.readAllBytes(caminho.get());

                    if (bytes.length == 0) {
                        continue;
                    }

                    modelo.setArquivoConteudo(bytes);
                    repository.save(modelo);

                } catch (IOException ex) {
                    log.warn("Nao foi possivel sincronizar arquivo do modelo {}: {}", modelo.getId(), ex.getMessage());
                }
            }

            if (page.isLast()) {
                break;
            }

            pagina++;
        }
    }

    public String getArquivoOriginalNome(ChecklistModelo checklistModelo) {
        return checklistModelo.getArquivoOriginalNome() != null && !checklistModelo.getArquivoOriginalNome().isBlank()
                ? checklistModelo.getArquivoOriginalNome()
                : checklistModelo.getArquivoNome();
    }

    private void apagarArquivoSeExistir(Optional<Path> caminhoArquivo, boolean falharSeNaoExcluir) {
        if (caminhoArquivo.isEmpty()) {
            return;
        }

        try {
            Files.deleteIfExists(caminhoArquivo.get());
        } catch (IOException ex) {
            if (falharSeNaoExcluir) {
                throw new BusinessException("Nao foi possivel excluir o arquivo do modelo.");
            }
        }
    }

    private Path obterDiretorioModelos() {
        String diretorioConfigurado = System.getenv("APP_MODELOS_DIR");
        if (diretorioConfigurado != null && !diretorioConfigurado.isBlank()) {
            return Paths.get(diretorioConfigurado).toAbsolutePath().normalize();
        }

        Path diretorioAtual = Paths.get("").toAbsolutePath().normalize();
        Path diretorioLocal = diretorioAtual.resolve("ModelosChecklist").normalize();

        if (Files.exists(diretorioLocal)) {
            return diretorioLocal;
        }

        Path diretorioPai = diretorioAtual.getParent();
        if (diretorioPai != null) {
            Path diretorioNoPai = diretorioPai.resolve("ModelosChecklist").normalize();
            if (Files.exists(diretorioNoPai)) {
                return diretorioNoPai;
            }
        }

        return diretorioLocal;
    }

    private Optional<Path> resolverCaminhoArquivo(ChecklistModelo checklistModelo) {
        if (checklistModelo.getArquivoNome() != null && !checklistModelo.getArquivoNome().isBlank()) {
            Optional<Path> porNome = encontrarArquivoPorNome(checklistModelo.getArquivoNome());
            if (porNome.isPresent()) {
                return porNome;
            }
        }

        if (checklistModelo.getArquivoOriginalNome() != null && !checklistModelo.getArquivoOriginalNome().isBlank()) {
            Optional<Path> porNomeOriginal = encontrarArquivoPorNome(checklistModelo.getArquivoOriginalNome());
            if (porNomeOriginal.isPresent()) {
                return porNomeOriginal;
            }
        }

        if (checklistModelo.getArquivoCaminho() != null && !checklistModelo.getArquivoCaminho().isBlank()) {
            Path caminhoPorRegistro = Paths.get(checklistModelo.getArquivoCaminho()).toAbsolutePath().normalize();

            if (Files.exists(caminhoPorRegistro)) {
                return Optional.of(caminhoPorRegistro);
            }
        }

        return Optional.empty();
    }

    private Optional<Path> encontrarArquivoPorNome(String nomeArquivo) {
        if (nomeArquivo == null || nomeArquivo.isBlank()) {
            return Optional.empty();
        }

        for (Path diretorio : listarDiretoriosCandidatos()) {
            Path direto = diretorio.resolve(nomeArquivo).normalize();
            if (Files.exists(direto) && Files.isRegularFile(direto)) {
                return Optional.of(direto);
            }

            Optional<Path> encontrado = buscarRecursivoPorNome(diretorio, nomeArquivo);
            if (encontrado.isPresent()) {
                return encontrado;
            }
        }

        return Optional.empty();
    }

    private Optional<Path> buscarRecursivoPorNome(Path diretorioBase, String nomeArquivo) {
        if (diretorioBase == null || !Files.exists(diretorioBase) || !Files.isDirectory(diretorioBase)) {
            return Optional.empty();
        }

        try (Stream<Path> stream = Files.walk(diretorioBase, 3)) {
            return stream
                    .filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().equalsIgnoreCase(nomeArquivo))
                    .findFirst();
        } catch (IOException ex) {
            log.warn("Falha ao buscar arquivo {} em {}: {}", nomeArquivo, diretorioBase, ex.getMessage());
            return Optional.empty();
        }
    }

    private List<Path> listarDiretoriosCandidatos() {
        List<Path> diretorios = new ArrayList<>();

        String diretorioConfigurado = System.getenv("APP_MODELOS_DIR");
        if (diretorioConfigurado != null && !diretorioConfigurado.isBlank()) {
            diretorios.add(Paths.get(diretorioConfigurado).toAbsolutePath().normalize());
        }

        Path atual = Paths.get("").toAbsolutePath().normalize();
        diretorios.add(atual.resolve("ModelosChecklist").normalize());

        Path pai = atual.getParent();
        if (pai != null) {
            diretorios.add(pai.resolve("ModelosChecklist").normalize());
        }

        return diretorios.stream().distinct().toList();
    }

    private String gerarNomeArquivo(String nomeOriginal, String extensao) {
        String base = removerExtensao(nomeOriginal)
                .replaceAll("[^a-zA-Z0-9-_]", "_")
                .replaceAll("_+", "_");

        if (base.isBlank()) {
            base = "modelo";
        }

        return base + "_" + FILE_TIMESTAMP.format(LocalDateTime.now()) + "_" + UUID.randomUUID().toString().substring(0, 8) + extensao;
    }

    private String obterExtensao(String nomeOriginal) {
        int indice = nomeOriginal.lastIndexOf('.');
        return indice >= 0 ? nomeOriginal.substring(indice) : "";
    }

    private String removerExtensao(String nomeOriginal) {
        int indice = nomeOriginal.lastIndexOf('.');
        return indice >= 0 ? nomeOriginal.substring(0, indice) : nomeOriginal;
    }
}
