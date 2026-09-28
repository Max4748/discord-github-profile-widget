# Discord GitHub Profile Widget

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-blue.svg)](https://nodejs.org/)

Automatically sync your GitHub profile to your Discord Profile Widget every hour using GitHub Actions.

## Preview

<img src="./docs/images/final-preview.png" width="300" />


## Getting Started

> [!IMPORTANT]
> **Discord Profile Widgets (Experimental)**
>
> Discord Profile Widgets are currently an experimental feature. Follow [Chloe Cinders' Blog Guide](https://chloecinders.com/blog/discord-widgets#displaying-the-widget-on-your-profile) to enable the required Discord experiments, create and publish your widget, and add it to your Discord profile before continuing.

> [!TIP]
> **Faster Setup Option**
>
> To avoid manually creating the widget, setting up the layout, and adding each field, you can use the [Discord-Widgets-Extension](https://github.com/TheCreativeGod/Discord-Widgets-Extension) by TheCreativeGod to import the pre-configured [`widget-config.json`](./imports/widget-config.json) file. See the [Widget Import Guide](./imports/guide.md) for step-by-step instructions.

### 1. Fork this Repository
Click the **Fork** button at the top-right of this repository.

### 2.  Add Widget Fields
*(If you followed the [Faster Setup Option](#getting-started), you can skip this step and proceed directly to **Step 3**).*

After creating your Discord Profile Widget, add the following fields under **Games -> Widget** in the [Discord Developer Portal](https://discord.com/developers/applications).

> [!NOTE]
> For a complete visual guide with screenshots showing how to configure each field in the Discord Developer Portal, please refer to the [docs/images](./docs/images) directory.


| Field | Type | Description |
| ------ | ---- | ----------- |
| `display_name` | String | GitHub display name |
| `username` | String | GitHub username |
| `joined` | String | GitHub account creation date |
| `avatar` | Media | GitHub profile avatar |
| `last_repo` | String | Most recently pushed repository |
| `last_commit` | String | Latest commit message |
| `top_repo` | String | Most starred repository (name + star count) |
| `forks` | Number | Repositories forked by you |
| `repos` | Number | Total repositories |
| `streak` | String | Longest contribution streak in the last 12 months |
| `contributions` | Number | Contributions this year |
| `top_language` | String | Top 3 most used languages (comma-separated) |
| `followers` | Number | GitHub followers |
| `prs` | Number | Total pull requests |

### 3. Get Discord Credentials
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and select your app.
2. Copy the **Application ID** from General Information. (`DISCORD_APPLICATION_ID`)
3. Copy your Bot token from the **Bot** tab (click **Reset Token**). (`DISCORD_BOT_TOKEN`)
4. Click your profile in Discord and click **Copy User ID**. (`DISCORD_USER_ID`) (Note: If this option does not appear, enable **Developer Mode** first in Discord Settings -> Developer).

### 4. Create a GitHub Personal Access Token
1. Go to GitHub Settings -> Developer Settings -> Personal Access Tokens (Classic).
2. Generate a token with scopes: `read:user` and `repo` (or `public_repo`).
3. Copy the token. (`GH_PAT`)

### 5. Configure GitHub Secrets
1. Go to your forked repository's **Settings** tab.
2. In the left sidebar, click **Secrets and variables -> Actions**.
3. Under the **Secrets** tab (open by default), find **Repository secrets** section.
4. Click the **New repository secret** button.
5. Add the following secrets one by one by entering the **Name** and **Value** (ensure there are no leading or trailing spaces) and clicking **Add secret**:

| Secret Name | Description |
| :--- | :--- |
| `GH_USERNAME` | Your GitHub Username (e.g., `AdityaLF`) |
| `GH_PAT` | The GitHub Personal Access Token (from Step 4) |
| `DISCORD_APPLICATION_ID` | The Application ID of your Discord App (from Step 3) |
| `DISCORD_USER_ID` | Your Discord User ID (from Step 3) |
| `DISCORD_BOT_TOKEN` | The Discord Bot Token (from Step 3) |

### 6. Run the GitHub Action
1. Go to the **Actions** tab of your repository.
2. *(First time only)* If prompted, click **"I understand my workflows, go ahead and enable them"**.
3. In the left sidebar under **Workflows**, select **Update Discord Profile Widget**.
4. On the right side, click the **Run workflow** dropdown and click the green **Run workflow** button to trigger the sync manually.

## Option B: Deploy with Cloudflare Workers (instead of GitHub Actions)

This project can also run as a [Cloudflare Worker](https://workers.cloudflare.com/) with a built-in hourly Cron Trigger, so you don't need to rely on GitHub Actions at all.

> [!IMPORTANT]
> **Pick one scheduler.** To avoid the widget being updated twice an hour (once by GitHub Actions and once by the Worker), disable the GitHub Actions workflow when using the Worker. No Settings needed — just edit one line at the top of [`.github/workflows/update-widget.yml`](./.github/workflows/update-widget.yml): set `DEFAULT_ENABLED: "false"`. (You can still force a manual run from the Actions tab via the `force_run` input.) Conversely, if you keep GitHub Actions, do not also deploy the Worker. Optionally, a repo variable `GH_ACTIONS_ENABLED` (Settings → Secrets and variables → Actions → Variables) can override the in-file default if you prefer.

### 1. Install Wrangler (local use only)
Wrangler is **not** a project dependency — the Cloudflare build uses its own copy. If you want to deploy locally, install it globally:
```bash
npm install -g wrangler
```

### 2. Set Worker Secrets
The same credentials from [Steps 3–4](#3-get-discord-credentials) are stored as Cloudflare secrets (not GitHub secrets):
```bash
wrangler secret put GH_USERNAME
wrangler secret put GH_PAT
wrangler secret put DISCORD_APPLICATION_ID
wrangler secret put DISCORD_USER_ID
wrangler secret put DISCORD_BOT_TOKEN
wrangler secret put MANUAL_TRIGGER_TOKEN   # used to protect the manual HTTP trigger
```

### 3. Deploy
If you connected your repo to Cloudflare via the dashboard, it auto-detects `wrangler.toml` and runs `wrangler deploy` on push. To deploy locally instead:
```bash
wrangler deploy
```
The Worker is configured in [`wrangler.toml`](./wrangler.toml) to run hourly via a Cron Trigger (`0 * * * *`). Note that sub-daily cron schedules require a Cloudflare Workers plan that supports them.

### 4. (Optional) Manual Trigger
The Worker also exposes an HTTP endpoint so you can sync on demand:
```bash
curl -H "Authorization: Bearer $MANUAL_TRIGGER_TOKEN" https://<your-worker-subdomain>.workers.dev/
```
Set `MANUAL_TRIGGER_TOKEN` to any secret string of your choice (the same value used in the secret above).

## Local Development

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/AdityaLF/discord-github-profile-widget.git
   cd discord-github-profile-widget
   npm install
   ```
2. Rename `.env.example` to `.env` in the root directory and fill:
   ```env
   # GitHub Configuration
   GH_USERNAME=your_github_username
   GH_PAT=your_github_personal_access_token

   # Discord Configuration
   DISCORD_APPLICATION_ID=your_discord_application_id
   DISCORD_USER_ID=your_discord_user_id
   DISCORD_BOT_TOKEN=your_discord_bot_token
   ```
3. Run the sync script:
   ```bash
   npm start
   ```

## Troubleshooting                                                                                                                                                               

If you run into any issues during setup or syncing (such as the `APPLICATION_IDENTITY_PROVIDER_USER_ID_MISMATCH` error), please refer to the [Troubleshooting Guide](./docs/troubleshooting.md).

## Credits

- Special thanks to [Chloe Cinders](https://chloecinders.com/blog/discord-widgets#displaying-the-widget-on-your-profile) for documenting Discord Profile Widgets and making this project possible.
- Thanks to [TheCreativeGod](https://github.com/TheCreativeGod) for creating [Discord-Widgets-Extension](https://github.com/TheCreativeGod/Discord-Widgets-Extension), which simplifies creating and configuring Discord Profile Widgets.

## License

This project is licensed under the [MIT License](LICENSE).
