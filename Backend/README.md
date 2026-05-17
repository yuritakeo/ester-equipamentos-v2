# Backend Spring Boot DOC DEV-LOW

Ambiente de desenvolvimento do backend Spring Boot com configuracao por perfil e migrations em `src/main/resources/db/migration`.

## Estrutura

- `src/main/resources/application.yml`: configuracao base
- `src/main/resources/application-dev.yml`: perfil local padrao
- `src/main/resources/application-dev-low.yml`: perfil local com uso menor de recursos
- `src/main/resources/application-prod.yml`: perfil de producao
- `src/main/resources/db/migration`: scripts Flyway versionados

## Requisitos

- Java 21
- Docker Desktop

## Subir o banco local

No diretorio `Backend/`:

```powershell
docker compose -f compose.dev.yml up -d
```

Credenciais locais:

- host: `localhost`
- porta: `5432`
- database: `checklist_nasr`
- usuario: `postgres`
- senha: `postgres`

## Rodar a aplicacao

Perfil dev:

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```

Perfil dev-low:

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev-low"
```

Validar compilacao:

```powershell
.\mvnw.cmd -DskipTests compile
```

## Variaveis de ambiente

O arquivo `.env` fica local e ignorado pelo Git.

Se precisar recriar, use `.env.example` como base.
