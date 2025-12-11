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

client.once("clientReady", () => {
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
    console.log("Ignoring event because it is not a pull_request.");
    return res.status(200).send("Ignored (not a pull_request event).");
  }

  const body = req.body;

  // Log some basics so we can see why an event might be ignored
  console.log(
    "PR event details:",
    "action =", body.action,
    "merged =", body.pull_request?.merged
  );

  if (!isMergedPullRequestEvent(body)) {
    console.log("Ignoring pull_request because it is not a merged PR.");
    return res.status(200).send("Ignored (not a merged PR).");
  }

  try {
    console.log("Merged PR detected, sending Discord notification...");
    await handleMergedPullRequest(body);
    console.log("Discord notification sent successfully.");
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
    console.warn("Updates channel not found for ID:", DISCORD_UPDATES_CHANNEL_ID);
    return;
  }

  const pr = event.pull_request;
  const repoName = event.repository.full_name;
  const mergedBy = event.sender.login;
  const openedBy = pr.user.login;
  const branch = pr.base.ref;

  // allowed repos
  const allowedRepos = ["flowglad/flowglad", "ir3stless/flowglad"];
  const allowedBranches = ["main"];

  if (!allowedRepos.includes(repoName) || !allowedBranches.includes(branch)) {
    console.log(`Skipping PR from ${repoName} on ${branch}`);
    return;
  }

  console.log(
    `Preparing embed for merged PR #${pr.number} in ${repoName} on branch ${branch}`
  );

  // Core GitHub URLs
  const prUrl = pr.html_url;                          // PR main page
  const filesUrl = `${pr.html_url}/files`;            // "Files changed" tab
  const commitsUrl = `${pr.html_url}/commits`;        // Commits in this PR
  const repoUrl = `https://github.com/${repoName}`;   // Repo root
  const commitsMainUrl = `${repoUrl}/commits/${branch}`; // Recent commits on branch

  const embed = new EmbedBuilder()
    .setTitle(`✅ PR merged: ${pr.title}`)
    .setURL(prUrl)
    .setColor(0x00ff99) // Flowglad green-ish
    .addFields(
      { name: "Repo", value: `\`${repoName}\``, inline: true },
      { name: "PR #", value: `#${pr.number}`, inline: true },
      { name: "Branch", value: `\`${branch}\``, inline: true },
      { name: "\u200B", value: "\u200B", inline: false }, // spacer
      { name: "Opened by", value: `\`${openedBy}\``, inline: true },
      { name: "Merged by", value: `\`${mergedBy}\``, inline: true },
      {
        name: "GitHub",
        value: [
          `[View PR](${prUrl})`,
          `[Files changed](${filesUrl})`,
          `[Commits in PR](${commitsUrl})`,
          `[Recent commits on ${branch}](${commitsMainUrl})`
        ].join(" · "),
        inline: false
      }
    )
    .setFooter({ text: "Flowglad PR updates • Built by ir3stless" })
    .setTimestamp(new Date());

  console.log("Sending embed to Discord channel:", channel.id);
  await channel.send({ embeds: [embed] });
  console.log("Embed sent.");
}



// Start HTTP server and Discord client
app.listen(PORT, () => {
  console.log(`HTTP server listening on port ${PORT}`);
});

client.login(DISCORD_BOT_TOKEN);