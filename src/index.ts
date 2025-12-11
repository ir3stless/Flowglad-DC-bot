import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import { Client, GatewayIntentBits, TextChannel, EmbedBuilder } from "discord.js";
import { isMergedPullRequestEvent, GitHubPullRequestEvent } from "./github";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_UPDATES_CHANNEL_ID = process.env.DISCORD_UPDATES_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

if (!DISCORD_BOT_TOKEN || !DISCORD_UPDATES_CHANNEL_ID) {
  throw new Error("Missing DISCORD_BOT_TOKEN or DISCORD_UPDATES_CHANNEL_ID in .env");
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once("ready", () => {
  console.log(`Discord bot logged in as ${client.user?.tag}`);
});

const app = express();

// Parse JSON from GitHub
app.use(bodyParser.json());

// Simple health check
app.get("/", (_req, res) => {
  res.send("Flowglad Discord bot is running.");
});

// GitHub webhook endpoint
app.post("/github-webhook", async (req, res) => {
  const eventType = req.header("x-github-event");
  console.log(`Received GitHub event: ${eventType}`);

  if (eventType !== "pull_request") {
    return res.status(200).send("Ignored (not a pull_request event).");
  }

  const body = req.body;

  if (!isMergedPullRequestEvent(body)) {
    return res.status(200).send("Ignored (not a merged PR).");
  }

  try {
    await handleMergedPullRequest(body);
    res.status(200).send("Notification sent.");
  } catch (err) {
    console.error("Error sending Discord notification:", err);
    res.status(500).send("Failed to send notification.");
  }
});

// Logic to send a message to Discord
async function handleMergedPullRequest(event: GitHubPullRequestEvent) {
  if (!client.isReady()) {
    console.warn("Discord client not ready yet.");
    return;
  }

  const channel = (await client.channels.fetch(
    DISCORD_UPDATES_CHANNEL_ID!
  )) as TextChannel | null;

  if (!channel) {
    console.warn("Updates channel not found.");
    return;
  }

  const pr = event.pull_request;
  const repoName = event.repository.full_name;
  const mergedBy = event.sender.login;

  const descriptionLines = [
    `**${pr.title}** (#${pr.number})`,
    "",
    `Repo: \`${repoName}\``,
    `Branch: \`${pr.base.ref}\``,
    "",
    `Opened by: \`${pr.user.login}\``,
    `Merged by: \`${mergedBy}\``
  ];

  const embed = new EmbedBuilder()
    .setTitle("PR merged")
    .setURL(pr.html_url)
    .setDescription(descriptionLines.join("\n"))
    .setTimestamp(new Date());

  await channel.send({ embeds: [embed] });
}

// Start HTTP server and Discord client
app.listen(PORT, () => {
  console.log(`HTTP server listening on port ${PORT}`);
});

client.login(DISCORD_BOT_TOKEN);