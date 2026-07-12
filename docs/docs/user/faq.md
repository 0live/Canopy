---
sidebar_position: 3
---

# Frequently Asked Questions

## General

### What is Canopy?

Canopy is a self-hostable platform for geospatial data and maps: accounts,
teams, atlases of maps, notifications, and secure per-user database access. See
[Getting Started](./getting-started).

### Is Canopy a website I sign up for?

No. You (or your organization) **host your own instance** on your own server and
domain. To deploy one, follow the [Deployment guide](./deployment).

### Can I see maps in Canopy today?

Not yet. The interactive map display and the visual map editor are still under
development and currently show a "work in progress" screen. Account, team,
atlas, notification and profile features work today.

### What browsers are supported?

The latest versions of Chrome, Firefox, Safari and Edge.

## Deployment

### What do I need to run Canopy?

A Linux server, a domain name pointed at it, and open ports 80/443. Everything
else (database, web server, HTTPS certificate) is set up for you. Full steps:
[Deployment guide](./deployment).

### Do I need to buy an HTTPS certificate?

No. Canopy obtains and renews a free HTTPS certificate automatically, as long as
your domain points to the server and ports 80/443 are reachable.

### Do I need an email provider?

Only if you want sign-up confirmation and password-reset emails to be delivered.
You can start without one and add SMTP settings later.

### How do I update to a newer version?

On the server, in the Canopy folder: `git pull` then `make rebuild-restart`. See
the [Deployment guide](./deployment#9-everyday-operations).

## Account

### How do I reset my password?

Use the **"Forgot password"** link on the login page. You'll receive a reset
link by email (email must be configured on the instance).

### I'm the administrator — how do I secure the default account?

Log in as `admin` / `admin`, change the password from your profile immediately,
and delete the demo accounts. See
[step 7 of the Deployment guide](./deployment#7-secure-your-first-login-important).

### How do I delete my account?

Ask an administrator of your instance to remove it.

### What is "database access" in my profile?

If an administrator grants it, you receive your own secure login to Canopy's
geospatial database, so you can connect with external tools. You choose your
password when you activate it.
