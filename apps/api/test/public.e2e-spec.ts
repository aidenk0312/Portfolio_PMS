import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('Public API (e2e)', () => {
    let app: INestApplication;
    const WS = process.env.NEXT_PUBLIC_WORKSPACE_ID || 'ws_local';

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('GET /health → 200', async () => {
        await request(app.getHttpServer()).get('/health').expect(200);
    });

    it('GET /health/db → 200', async () => {
        await request(app.getHttpServer()).get('/health/db').expect(200);
    });

    it('GET /boards?workspaceId=... → 200 array', async () => {
        const res = await request(app.getHttpServer())
            .get(`/boards?workspaceId=${WS}`)
            .expect(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /boards without Authorization → 401', async () => {
        await request(app.getHttpServer())
            .post('/boards')
            .send({ name: 'tmp', workspaceId: WS })
            .expect(401);
    });
});