import { withAuth } from 'next-auth/middleware';

export default withAuth({
    pages: {
        signIn: '/login',
    },
});

// export const config = {
//     matcher: ['/kanban'],
// };

export const config = {
    matcher: [],
};