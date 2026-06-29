# Deploy do PadelZone (servidor com Docker)

Guia para pôr o PadelZone a correr num servidor Linux ao qual acedes por SSH (PuTTY).
A app e a base de dados correm em containers; só precisas de Docker no servidor.

## 1. Pré-requisitos no servidor (uma vez)

Liga-te por PuTTY e instala o Docker (Ubuntu/Debian):

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER     # opcional: usar docker sem sudo (sai e volta a entrar)
docker --version
docker compose version
```

## 2. Obter o código

```bash
git clone https://github.com/PauloTavaresProVision/padelzone.git
cd padelzone
```

## 3. Configurar as variáveis de ambiente

```bash
cp .env.example .env
# gera um segredo forte para as sessões:
echo "AUTH_SECRET=$(openssl rand -hex 32)" >> .env
nano .env    # confirma o AUTH_SECRET (e Google, se usares)
```

> O `DATABASE_URL` do `.env` é ignorado dentro do Docker — o compose aponta a app
> para o serviço `db` automaticamente. O essencial é o **AUTH_SECRET**.

## 4. Arrancar

```bash
docker compose up -d --build
```

Isto constrói a imagem, arranca o Postgres e a app, e **aplica as migrações** no arranque.
A app fica em `http://SEU_IP:7756`.

## 5. Criar o primeiro acesso (uma vez, base de dados nova)

```bash
docker compose exec app npx prisma db seed
```

Cria o utilizador inicial **admin@padelzone.ao / password123** (perfil master/ADMIN).
Entra, **muda já a palavra-passe**, e cria os teus clubes reais.
(O seed traz também um clube/competição de demonstração que podes apagar.)

## 6. Abrir a porta

Garante que a porta **7756** está aberta na firewall do servidor / no painel do fornecedor.
Ex. (ufw): `sudo ufw allow 7756/tcp`

## Comandos úteis

```bash
docker compose logs -f app     # ver logs da app
docker compose ps              # estado dos containers
docker compose down            # parar
docker compose up -d --build   # aplicar alterações após um git pull
```

## Atualizar (novas versões)

```bash
cd padelzone
git pull
docker compose up -d --build
```

## Notas

- **HTTPS / domínio:** para um domínio com certificado, põe um reverse proxy à frente
  (Caddy ou Nginx) a encaminhar para `localhost:7756`. O Caddy trata do certificado
  Let's Encrypt automaticamente.
- **Base de dados:** o Postgres só está acessível dentro do servidor (porta presa a
  `127.0.0.1`). Os dados persistem no volume `padelzone_pgdata`.
- **Segredos:** o `.env` nunca vai para o GitHub. Mantém uma cópia segura do `AUTH_SECRET`
  (se o mudares, todas as sessões são invalidadas).
- **Multicaixa/ProxyPay, SMTP e WeSender:** configuram-se na app (área master → Definições),
  não em ficheiros.
