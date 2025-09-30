import request from 'supertest';

const API = 'http://localhost:3001';

describe('PMS Smoke', () => {
    let workspaceId = '';
    let boardId = '';
    let colA = '';
    let colB = '';
    let issue1 = '';
    let issue2 = '';

    beforeAll(async () => {
        workspaceId = 'ws_local';
    });

    it('create board', async () => {
        const res = await request(API).post('/boards').send({ name: 'e2e board', workspaceId });
        expect(res.status).toBeLessThan(300);
        boardId = res.body.id;
        expect(boardId).toBeTruthy();
    });

    it('create columns', async () => {
        const a = await request(API).post('/columns').send({ name: 'To Do', boardId, order: 0 });
        const b = await request(API).post('/columns').send({ name: 'Doing', boardId, order: 1 });
        expect(a.status).toBeLessThan(300);
        expect(b.status).toBeLessThan(300);
        colA = a.body.id;
        colB = b.body.id;
    });

    it('create issues', async () => {
        const i1 = await request(API).post('/issues').send({ title: 'Task 1', workspaceId, columnId: colA });
        const i2 = await request(API).post('/issues').send({ title: 'Task 2', workspaceId, columnId: colA });
        expect(i1.status).toBeLessThan(300);
        expect(i2.status).toBeLessThan(300);
        issue1 = i1.body.id;
        issue2 = i2.body.id;
    });

    it('move issue to other column (PATCH)', async () => {
        const res = await request(API).patch(`/issues/${issue1}`).send({ columnId: colB });
        expect(res.status).toBeLessThan(300);
    });

    it('reorder issues in a column', async () => {
        const res = await request(API).post(`/columns/${colA}/reorder`).send({ issueIds: [issue2] });
        expect(res.status).toBeLessThan(300);
    });

    it('get board full', async () => {
        const res = await request(API).get(`/boards/${boardId}/full`);
        expect(res.status).toBeLessThan(300);
        expect(Array.isArray(res.body.columns)).toBe(true);
    });

    it('delete issue and compact order', async () => {
        const del = await request(API).delete(`/issues/${issue2}`);
        expect(del.status).toBe(204);
    });

    it('delete column (cascade issues)', async () => {
        const del = await request(API).delete(`/columns/${colB}`);
        expect(del.status).toBe(204);
    });

    it('delete board (restrict should fail)', async () => {
        const res = await request(API).delete(`/boards/${boardId}`);
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('delete board cascade ok', async () => {
        const res = await request(API).delete(`/boards/${boardId}`).query({ cascade: 'true' });
        expect(res.status).toBe(204);
    });
});
