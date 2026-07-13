---
sidebar_position: 2
---

# Deploying Canopy (easy guide)

This guide is written for someone who is **not a developer**. If you can copy and
paste commands into a terminal, you can put Canopy online. It should take about
20–30 minutes.

You do **not** need to understand the code. Canopy ships as a set of ready-made
containers; you just provide a server, a domain name, and a few settings.

:::tip In one sentence
Get a Linux server → point your domain at it → download Canopy → fill in a small
settings file → run one command.
:::

## 1. What you need before you start

1. **A Linux server** (a small cloud VM is fine, e.g. 2 vCPU / 4 GB RAM). You
   should be able to connect to it with SSH.
2. **A domain name** (like `maps.example.com`) that you can configure.
3. **Ports 80 and 443 open** on the server (these are the standard web ports;
   Canopy uses them to serve the site and to get a free HTTPS certificate
   automatically).
4. An **email service (SMTP)** if you want sign-up and password-reset emails to
   work. Any provider works (e.g. your mailbox provider, SendGrid, Mailgun…).
   You can skip this at first and add it later.

## 2. Point your domain at the server

In your domain provider's dashboard, create an **A record** for your chosen name
(e.g. `maps.example.com`) pointing to your server's **public IP address**.

Give it a few minutes to take effect. This step is what lets Canopy set up
HTTPS (the padlock in the browser) for you automatically.

## 3. Install the required tools on the server

Connect to your server with SSH, then install Docker and a couple of small
utilities. On Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin make git openssl
sudo usermod -aG docker $USER   # lets you run docker without sudo
# log out and back in once, so the group change takes effect
```

Check it works:

```bash
docker --version
docker compose version
```

## 4. Download Canopy

```bash
git clone <the-canopy-repository-url> canopy
cd canopy
```

*(Replace `<the-canopy-repository-url>` with the address where Canopy's code
lives.)*

## 5. Fill in the settings file

Canopy reads its settings from a file named `.env`. Start from the example:

```bash
cp .env.example .env
nano .env      # or any text editor
```

Change these lines (leave the rest as they are for now):

| Setting             | What to put                                                        |
| ------------------- | ------------------------------------------------------------------ |
| `ENV`               | `prod`                                                             |
| `SITE_ADDRESS`      | your domain, **without** `http://` — e.g. `maps.example.com`       |
| `POSTGRES_USER`     | a database username you invent, e.g. `canopy`                     |
| `POSTGRES_PASSWORD` | a **strong** password you invent                                  |
| `POSTGRES_DB`       | a database name you invent, e.g. `canopy`                         |

If you have an email service, also fill in the `SMTP_*` lines (host, port,
username, password, from-address). If you don't yet, you can leave them and add
them later — just know that sign-up confirmation emails won't be delivered until
you do.

:::note You do NOT set the secret keys yourself
The file mentions `PRIVATE_KEY` and `ALTCHA_HMAC_KEY`. **Leave them alone** — the
next step generates strong random ones for you. Canopy will actually refuse to
start in production if these are left at their example values.
:::

## 6. Launch it

One command builds everything, starts it, and prepares the database:

```bash
make create-app
```

The first run downloads and builds the containers, so it can take several
minutes. When it finishes, open your domain in a browser:

```
https://maps.example.com
```

You should see Canopy, with a valid HTTPS padlock. 🎉

## 7. Create your administrator account

Canopy never ships with a default admin account or password. Instead, the last
lines printed by `make create-app` in your terminal look like this:

```
✅ No administrator account found. Visit this URL to create one (valid 30 minutes):
https://maps.example.com/setup?token=Xy...
```

Open that link in your browser within 30 minutes and fill in the email,
username, and password for your administrator account. Once submitted, you're
logged in as an administrator — there is nothing to change afterwards, since no
default credentials ever existed.

:::tip Missed the link, or it expired?
Just run `make create-app` again (or `ENV=prod make bootstrap-admin` directly).
It's safe to re-run: as long as no administrator account exists yet, it prints
a fresh link. Once an administrator has been created, running it again does
nothing.
:::

## 8. Check everything is healthy

- Visiting `https://<your-domain>/` shows the app with a padlock → the web front
  and HTTPS work.
- You can log in with the administrator account you just created → the
  database works.
- If you configured email: use "Forgot password" and confirm you receive the
  message.

## 9. Everyday operations

From the `canopy` folder on the server:

```bash
ENV=prod make start      # start Canopy
ENV=prod make stop       # stop Canopy (⚠ this also wipes data volumes)
```

:::caution About `make stop`
`make stop` removes the containers **and their data volumes**. For a running
production site, avoid it unless you intend to reset. To just pause without
deleting data, ask whoever maintains your server, or use the technical
[Docker development](../technical/docker/development) notes.
:::

To update to a newer version of Canopy later:

```bash
cd canopy
git pull
make rebuild-restart
```

## Troubleshooting

- **The page doesn't load / no padlock** — check your domain's A record points to
  the server, and that ports 80 and 443 are open in the server's firewall.
  HTTPS certificates only work with a real domain (not a bare IP address).
- **"It says the site is not secure" on first minutes** — certificate issuance
  can take a moment after the domain starts resolving. Wait a few minutes and
  refresh.
- **No confirmation email** — your `SMTP_*` settings are missing or wrong. See
  section 5.
- **It won't start and mentions a "secret key"** — you set `PRIVATE_KEY` or
  `ALTCHA_HMAC_KEY` by hand. Remove your values and re-run `make create-app` so
  it generates them.
- **I need more detail** — the full technical reference is in
  [Installation & Setup](../technical/installation).
