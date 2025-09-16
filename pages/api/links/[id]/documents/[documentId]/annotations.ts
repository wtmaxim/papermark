import { NextApiRequest, NextApiResponse } from "next";

import { errorhandler } from "@/lib/errorHandler";
import { getFeatureFlags } from "@/lib/featureFlags";
import prisma from "@/lib/prisma";
import { log } from "@/lib/utils";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const {
    id: linkId,
    documentId: dataroomDocumentId,
    viewId,
  } = req.query as {
    id: string;
    documentId: string;
    viewId: string;
  };

  try {
    const view = await prisma.view.findUnique({
      where: { id: viewId, linkId: linkId },
      select: {
        id: true,
        viewedAt: true,
        link: {
          select: {
            id: true,
            linkType: true,
            teamId: true,
            documentId: true,
            dataroomId: true,
          },
        },
      },
    });

    if (!view) {
      return res.status(404).json({ error: "View not found" });
    }

    // Check TTL - deny access for views older than 23 hours
    if (view.viewedAt < new Date(Date.now() - 23 * 60 * 60 * 1000)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if annotations feature is enabled for this team
    const featureFlags = await getFeatureFlags({
      teamId: view.link.teamId || undefined,
    });
    if (!featureFlags.annotations) {
      return res.status(200).json([]); // Return empty array if feature is disabled
    }

    let document = null;

    if (view.link.linkType === "DOCUMENT_LINK") {
      // For document links, get the document directly
      document = await prisma.document.findUnique({
        where: { id: view.link.documentId! },
        include: {
          annotations: {
            where: {
              isVisible: true, // Only return visible annotations for viewers
            },
            include: {
              images: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });
    } else if (view.link.linkType === "DATAROOM_LINK") {
      // For dataroom links, get the specific dataroom document
      const dataroomDocument = await prisma.dataroomDocument.findFirst({
        where: {
          id: dataroomDocumentId,
          dataroomId: view.link.dataroomId!,
        },
        include: {
          document: {
            include: {
              annotations: {
                where: {
                  isVisible: true, // Only return visible annotations for viewers
                },
                include: {
                  images: true,
                },
                orderBy: {
                  createdAt: "desc",
                },
              },
            },
          },
        },
      });

      document = dataroomDocument?.document;
    }

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    const annotations = document.annotations || [];

    // Remove sensitive information (don't expose createdBy details to viewers)
    const sanitizedAnnotations = annotations.map((annotation) => ({
      id: annotation.id,
      title: annotation.title,
      content: annotation.content,
      pages: annotation.pages,
      images: annotation.images,
      createdAt: annotation.createdAt,
    }));

    return res.status(200).json(sanitizedAnnotations);
  } catch (error) {
    log({
      message: `Failed to get annotations for link: _${linkId}_ and document: _${dataroomDocumentId}_. \n\n ${error}`,
      type: "error",
    });
    errorhandler(error, res);
  }
}
