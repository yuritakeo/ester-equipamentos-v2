# 📘 Guia para Dev (DEV-LOW)

Este documento resolve problemas comuns ao rodar o projeto.

---

# 🚀 PASSO 0 — VERIFICAR ESTRUTURA

Antes de começar, confirme que você está na raiz do projeto.

## ✅ Ver arquivos

~~~bash
ls
~~~

Você deve ver:

Backend  
Checklist_equipamentos  
docker-compose.yml  

---

# 🏗️ PASSO 1 — BUILD DO BACKEND

## 🔹 Ir para pasta do backend

~~~bash
cd Backend
~~~

## ✅ Confirmar que está na pasta correta

~~~bash
ls
~~~

Deve existir:

pom.xml  
mvnw  
src  

---

## 🔹 Gerar o arquivo JAR

~~~bash
./mvnw clean package -DskipTests
~~~

Resultado esperado:

BUILD SUCCESS  

---

## 🔹 Voltar para raiz

~~~bash
cd ..
~~~

---

# 🐳 PASSO 2 — SUBIR SISTEMA

~~~bash
docker compose up -d --build
~~~

---

# 🌐 PASSO 3 — ACESSAR SISTEMA

Frontend:  
http://localhost:5173  

Backend:  
http://localhost:8080  

Swagger:  
http://localhost:8080/swagger-ui/index.html  

---

# 🚨 PROBLEMA COMUM: LOMBOK

Se aparecer erro como:

variable not initialized in the default constructor  
cannot find symbol getId()  
cannot find symbol builder()  

👉 NÃO é erro do código  
👉 É problema de ambiente  

---

# ✅ SOLUÇÃO NO VSCODE

## 🔹 Instalar extensão Lombok

Ctrl + Shift + X  

Buscar:

Lombok Annotations Support for VS Code  

---

## 🔹 Configurar Java

Ctrl + Shift + P  

Digite:

Java: Configure Java Runtime  

👉 usar JDK 21  

---

## 🔹 Limpar cache

Ctrl + Shift + P  

Java: Clean Java Language Server Workspace  

---

## 🔹 Recarregar VSCode

Ctrl + Shift + P  
Reload Window  

---

## 🔹 Rebuild do projeto

~~~bash
cd Backend
./mvnw clean compile
~~~

---

# ✅ VALIDAR BUILD

~~~bash
./mvnw clean package -DskipTests
~~~

Resultado esperado:

BUILD SUCCESS  

---

# ⚠️ IMPORTANTE

Erro:

not initialized in default constructor  

👉 Pode ignorar se o build passou  

---

# ✅ SOLUÇÃO NO INTELLIJ

## 🔹 Instalar plugin

File → Settings → Plugins  

Buscar:

Lombok  

---

## 🔹 Habilitar annotation processing

File → Settings → Build → Compiler → Annotation Processors  

✔ Enable annotation processing  

---

## 🔹 Reimportar projeto

Reload Project  

---

## 🔹 Validar build

~~~bash
./mvnw clean package
~~~

---

# 🧠 COMANDOS ÚTEIS

## 🔹 Ver containers

~~~bash
docker ps
~~~

---

## 🔹 Parar tudo

~~~bash
docker compose down
~~~

---

## 🔹 Limpar volumes

~~~bash
docker compose down -v
~~~

---

# 🚀 FLUXO FINAL

## 🔹 Backend

~~~bash
cd Backend
~~~

~~~bash
./mvnw clean package -DskipTests
~~~

## 🔹 Voltar

~~~bash
cd ..
~~~

## 🔹 Subir sistema

~~~bash
docker compose up -d --build
~~~

---

# 🔥 DICA FINAL

Se algo quebrar:

~~~bash
cd Backend
./mvnw clean package
~~~

👉 Depois continue o processo  

---

# ✅ CONCLUSÃO

- Não alterar código  
- Apenas configurar ambiente  
- Seguir passo a passo  
``