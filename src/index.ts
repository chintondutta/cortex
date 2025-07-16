import express, { Request, Response, NextFunction } from "express";
const app = express();

import { PrismaClient, User } from "@prisma/client";
const prisma = new PrismaClient();

import "./auth/passport"
import passport from "passport";

import jwt from "jsonwebtoken";
import { auth } from "./auth/middleware";
import { JWT_SECRET } from "./config";

import bcrypt from "bcrypt";

import { z } from "zod";
import { generateRandomHash } from "./utils";

interface CustomRequest extends Request {
    userId?: string;
}

app.use(express.json());
app.use(passport.initialize());


app.post("/signup", async function (req: Request, res: Response) {

    const signupSchema = z.object({
        username: z.string().min(3).max(100),
        password: z.string().min(3).max(100),
    });

    const parsed = signupSchema.safeParse(req.body);

    if (!parsed.success) {
        res.json({
            message: "Incorrect Format",
            error: parsed.error
        });
        return;
    }

    const { username, password } = parsed.data;

    try {
        const hashedPassword = await bcrypt.hash(password, 5);
        await prisma.user.create({
            data: {
                username,
                password: hashedPassword
            }
        })
    }
    catch (err) {
        res.json({
            message: "User already exists",
        });
        return;
    }

    res.json({
        message: "You are signed up"
    });
});

app.post("/signin", function (req: Request, res: Response, next: NextFunction) {

    const signinSchema = z.object({
        username: z.string().min(3).max(100),
        password: z.string().min(3).max(100)
    });

    const parsed = signinSchema.safeParse(req.body);

    if (!parsed.success) {
        res.json({
            message: "Incorrect Format",
            error: parsed.error
        });
        return;
    }

    passport.authenticate(
        "local",
        { session: false },
        function (
            err: Error | null,
            user: User | false,
            info: { message?: string } | undefined
        ) {
            if (err || !user) {
                res.status(401).json({ message: info?.message || "Invalid credentials" });
                return;
            }

            const token = jwt.sign({ userId: user.id.toString() }, JWT_SECRET, { expiresIn: "1h" });
            res.json({ token });
        }
    )(req, res, next);
});

app.post("/content", auth, async function (req: CustomRequest, res: Response) {

    const createContentSchema = z.object({
        title: z.string().min(1).max(200),
        link: z.string().url(),
        type: z.enum(["image", "video", "article", "audio"]),
        tags: z.array(z.string())
    });

    const parsed = createContentSchema.safeParse(req.body);

    if (!parsed.success) {
        res.json({
            message: "Incorrect Format",
            error: parsed.error
        });
        return;
    }

    const { title, link, type, tags } = parsed.data;
    const userId = req.userId;

    if (!userId) {
        res.status(401).json({ message: "Unauthorized: No user ID found." });
        return;
    }

    try {
        await prisma.content.create({
            data: {
                title,
                link,
                type,
                userId,
                tags: {
                    connect: tags.map((tagId: string) => ({ id: tagId }))
                }
            }
        });
        res.status(200).json({ message: "Document created successfully" });
    }
    catch (err) {
        res.json({ message: "Unable to create document" });
    }

});

app.get("/content", auth, async function (req: CustomRequest, res: Response) {

    const userId = req.userId;

    try {
        const contents = await prisma.content.findMany({
            where: { userId },
            include: { tags: { select: { title: true } } }
        });

        res.json(contents);
    }
    catch (err) {
        res.json({ message: "Unauthorized request" });
    }

});

app.put("/content/:id", auth, async function (req: CustomRequest, res: Response) {
    const updateContentParamsSchema = z.object({
        id: z.string()
    });

    const updateContentBodySchema = z.object({
        title: z.string().min(1).max(200),
        link: z.string().url(),
        type: z.enum(["image", "video", "article", "audio"]),
        tags: z.array(z.string())
    });

    const parsedParams = updateContentParamsSchema.safeParse(req.params);
    const parsedBody = updateContentBodySchema.safeParse(req.body);

    if (!parsedParams.success || !parsedBody.success) {
        res.status(400).json({
            message: "Incorrect Format",
            error: {
                ...(parsedParams.error && { params: parsedParams.error }),
                ...(parsedBody.error && { body: parsedBody.error })
            }
        });
        return;
    }

    const contentId = parsedParams.data.id;
    const { title, link, type, tags } = parsedBody.data;
    const userId = req.userId;

    if (!userId) {
        res.status(401).json({ message: "Unauthorized: No user ID found." });
        return;
    }

    try {
        const existing = await prisma.content.findUnique({
            where: { id: contentId },
            select: { userId: true }
        });

        if (!existing || existing.userId !== userId) {
            res.status(403).json({ message: "Forbidden: You don't have access to this content" });
            return;
        }

        await prisma.content.update({
            where: { id: contentId },
            data: {
                title,
                link,
                type,
                tags: {
                    set: [],
                    connect: tags.map(tagId => ({ id: tagId }))
                }
            }
        });

        res.status(200).json({ message: "Content updated successfully" });
    } catch (err) {
        res.status(500).json({ message: "Server error while updating content" });
    }
});

app.delete("/content/:id", auth, async function (req: CustomRequest, res: Response) {

    const deleteContentSchema = z.object({
        id: z.string()
    });

    const parsed = deleteContentSchema.safeParse(req.params);

    if (!parsed.success) {
        res.json({
            message: "Incorrect Format",
            error: parsed.error
        });
        return;
    }

    const contentId = parsed.data.id;
    const userId = req.userId;

    try {
        const content = await prisma.content.deleteMany({
            where: {
                id: contentId,
                userId
            }
        })

        if (!content) {
            res.json({ message: "Document Unavailable or Unauthorized request" });
            return;
        }

        res.json({ message: "Document deleted successfully" });
    }
    catch (err) {
        res.json({ message: "Error while deleting document" });
    }
});

app.post("/brain/share", auth, async function (req: CustomRequest, res: Response) {

    const shareBrainSchema = z.object({
        share: z.boolean()
    });

    const parsed = shareBrainSchema.safeParse(req.body);

    if (!parsed.success) {
        res.json({
            message: "Incorrect Format",
            error: parsed.error
        });
        return;
    }

    const share = parsed.data.share;
    const userId = req.userId;

    if (!userId) {
        res.status(401).json({ message: "Unauthorized: No user ID found." });
        return;
    }

    try {
        if (share) {
            await prisma.link.create({
                data: {
                    hash: generateRandomHash(),
                    userId
                }
            })
        }
        else {
            await prisma.link.delete({
                where: { userId }
            });
        }
        res.json({ message: "Updated sharable link" });
    }
    catch (err) {
        res.json({ message: "Error occurred" });
    }
});

app.get("/brain/:shareLink", async function (req: Request, res: Response) {

    const brainLinkSchema = z.object({
        shareLink: z.string()
    });

    const parsed = brainLinkSchema.safeParse(req.params);

    if (!parsed.success) {
        res.json({
            message: "Incorrect Format",
            error: parsed.error
        });
        return;
    }

    const hash = parsed.data.shareLink;

    try {

        const link = await prisma.link.findUnique({
            where: { hash }
        });

        if (!link) {
            res.json({ message: "Sorry! Incorrect Input" });
            return;
        }

        const contents = await prisma.content.findMany({
            where: { userId: link.userId },
            include: { tags: { select: { title: true } } }
        });
        res.json({ contents });

    }
    catch (err) {

        res.json({ message: "Error Occurred" });

    }

});

app.listen(3000);
