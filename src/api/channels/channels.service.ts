import { getDiscordBot } from "../../utils/discord";
import { OverwriteResolvable } from "discord.js";
import { ERRORS } from "../error/error.constant";
import { getDbClient } from "../../utils/database";
import { serverLogger } from "../../utils/logger";
import { channelDBSchema, channelPostRequest } from "./channels.schema";

export const addChannel = async (request: channelPostRequest) => {
  const { categoryId, channelName, userIds } = request;
  const client = await getDiscordBot();
  const guild = client?.guilds.cache.get(process.env.GUILD_ID!);
  try {
    const textPermissions: OverwriteResolvable[] = [
      {
        id: guild!.roles.cache.find((role) => role.name === "@everyone")!.id,
        deny: ["VIEW_CHANNEL"],
      },
    ];
    const voicePermissions: OverwriteResolvable[] = [
      {
        id: guild!.roles.cache.find((role) => role.name === "@everyone")!.id,
        deny: ["VIEW_CHANNEL"],
      },
    ];
    const textPromises = userIds.map(async (userId) => {
      const myId = (await guild?.members.fetch(userId))!.id;
      textPermissions.push({
        id: myId,
        allow: [
          "VIEW_CHANNEL",
          "READ_MESSAGE_HISTORY",
          "SEND_MESSAGES",
          "EMBED_LINKS",
          "ATTACH_FILES",
          "ADD_REACTIONS",
          "USE_EXTERNAL_EMOJIS",
        ],
      });
    });
    const voicePromises = userIds.map(async (userId) => {
      const myId = (await guild?.members.fetch(userId))!.id;
      voicePermissions.push({
        id: myId,
        allow: ["CONNECT", "STREAM", "SPEAK", "USE_VAD"],
      });
    });
    await Promise.all(textPromises);
    await Promise.all(voicePromises);
    const createdTextChannel = await guild?.channels.create(
      `${channelName}-text`,
      {
        type: "text",
        parent: categoryId,
        permissionOverwrites: textPermissions,
      }
    );
    const createdVoiceChannel = await guild?.channels.create(
      `${channelName}-voice`,
      {
        type: "voice",
        parent: categoryId,
        permissionOverwrites: voicePermissions,
      }
    );
    const db = await (await getDbClient())
      .db()
      .collection<channelDBSchema>("private-channels");
    await db.insertOne({
      channelName,
      categoryId,
      userIds,
      channelId: {
        text: createdTextChannel!.id,
        voice: createdVoiceChannel!.id,
      },
    });
    return {
      text: createdTextChannel?.id,
      voice: createdVoiceChannel?.id,
    };
  } catch (err) {
    serverLogger("webhook-error", "Webhook Channel Add", err);
    throw ERRORS.INTERNAL_SERVER_ERROR;
  }
};

export const deleteChannel = async (
  channelIds: string[]
): Promise<Array<string | null>> => {
  const client = await getDiscordBot();
  const guild = client?.guilds.cache.get(process.env.GUILD_ID!);
  try {
    const db = await (await getDbClient()).db().collection("private-channels");
    const promises = channelIds.map(
      async (channelId: string): Promise<string | null> => {
        try {
          const channel = await guild?.channels.cache.find(
            (chan) => chan.id === channelId
          );
          await channel?.delete("Channel Expired");
          const deletedText = await db.updateOne(
            { "channelId.text": channelId },
            { $unset: { "channelId.text": "" } }
          );
          const deletedVoice = await db.updateOne(
            { "channelId.voice": channelId },
            { $unset: { "channelId.voice": "" } }
          );
          await db.deleteOne({ channelId: {} });
          if (
            deletedText.modifiedCount === 1 ||
            deletedVoice.modifiedCount === 1
          )
            return channelId;
          else return null;
        } catch (err) {
          return null;
        }
      }
    );
    const deletedChannelIds = await Promise.all(promises);
    return deletedChannelIds;
  } catch (err) {
    serverLogger("webhook-error", "Webhook Channel Delete", err);
    throw ERRORS.DISCORD_CHANNEL_404;
  }
};
