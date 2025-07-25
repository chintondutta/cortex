import passport from "passport";
import passportLocal from "passport-local";
import passportJWT from "passport-jwt";

import bcrypt from "bcrypt";

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

import { JWT_SECRET } from "../config";


const local = passportLocal.Strategy;
const jwt = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

//Local Strategy
passport.use(new local(
    async function (username: string, password: string, done) {
        try {

            const user = await prisma.user.findUnique({ where: { username } })
            if (!user) {
                return done(null, false, { message: "Incorrect username" });
            }

            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return done(null, false, { message: "Incorrect password" });
            }

            return done(null, user);
        }
        catch (err) {
            return done(err, false);
        }
    }
));

//JWT Strategy
interface JWTPayload {
    userId: string;
}
passport.use(new jwt(
    {
        jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
        secretOrKey: JWT_SECRET
    },

    async function (JWTPayload: JWTPayload, done) {
        try {
            const user = await prisma.user.findUnique({ where: { id: JWTPayload.userId } });
            if (user) {
                return done(null, user);
            }
            else {
                return done(null, false);
            }
        }
        catch (err) {
            return done(err, false);
        }
    }
));