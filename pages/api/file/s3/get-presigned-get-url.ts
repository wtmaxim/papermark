import { NextApiRequest, NextApiResponse } from "next";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as getCloudfrontSignedUrl } from "@aws-sdk/cloudfront-signer";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";

import { ONE_HOUR, ONE_SECOND } from "@/lib/constants";
import { getTeamS3ClientAndConfig } from "@/lib/files/aws-client";
import { log } from "@/lib/utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  // Extract the API Key from the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1]; // Assuming the format is "Bearer [token]"

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if the API Key matches
  if (!process.env.INTERNAL_API_KEY) {
    log({
      message: "INTERNAL_API_KEY environment variable is not set",
      type: "error",
    });
    return res.status(500).json({ message: "Server configuration error" });
  }
  
  // DEBUG: Log les clés pour comparer
  console.log("🔍 DEBUG: Comparing API keys", {
    receivedToken: token?.substring(0, 20) + "...",
    expectedToken: process.env.INTERNAL_API_KEY?.substring(0, 20) + "...",
    tokensMatch: token === process.env.INTERNAL_API_KEY,
    receivedLength: token?.length || 0,
    expectedLength: process.env.INTERNAL_API_KEY?.length || 0
  });
  
  if (token !== process.env.INTERNAL_API_KEY) {
    console.log("❌ API key mismatch", {
      receivedToken: token?.substring(0, 20) + "...",
      expectedToken: process.env.INTERNAL_API_KEY?.substring(0, 20) + "..."
    });
    log({
      message: "API key mismatch - Unauthorized access attempt",
      type: "error",
    });
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { key } = req.body as { key: string };

  // DEBUG: Log la clé reçue
  console.log("🔑 DEBUG: Received key", { key, teamId: key.split("/")[0] });

  try {
    // Extract teamId from key (format: teamId/docId/filename)
    const teamId = key.split("/")[0];
    if (!teamId) {
      log({
        message: `Invalid key format: ${key}`,
        type: "error",
      });
      return res.status(400).json({ error: "Invalid key format" });
    }

    console.log("🏗️ DEBUG: Getting S3 client and config for teamId", { teamId });
    const { client, config } = await getTeamS3ClientAndConfig(teamId);
    console.log("✅ DEBUG: S3 client and config retrieved", { 
      hasClient: !!client, 
      hasConfig: !!config,
      distributionHost: config?.distributionHost,
      bucket: config?.bucket
    });

    // TEMPORAIREMENT : Utiliser S3 direct au lieu de CloudFront
    // TODO: Configurer CloudFront plus tard
    console.log("⚠️ DEBUG: Using S3 direct URLs (CloudFront not configured)");
    
    // Désactiver CloudFront temporairement
    config.distributionHost = undefined;

    const getObjectCommand = new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    });

    const url = await getS3SignedUrl(client, getObjectCommand, {
      expiresIn: ONE_HOUR / ONE_SECOND,
    });

    return res.status(200).json({ url });
  } catch (error) {
    log({
      message: `Error getting presigned get url for ${key} \n\n ${error}`,
      type: "error",
    });
    return res
      .status(500)
      .json({ error: "AWS Cloudfront Signed URL Error", message: error });
  }
}
