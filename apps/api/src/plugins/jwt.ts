import { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { env } from '../config/env';

export default async function jwtPlugin(server: FastifyInstance): Promise<void> {
  await server.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '1h', algorithm: 'HS256' },
    cookie: { cookieName: 'access_token', signed: false },
  });
}
