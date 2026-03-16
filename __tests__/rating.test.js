// Mock del middleware PRIMERO (antes de requires)
jest.mock('../middleware/authMiddleware', () => {
  return (req, res, next) => {
    req.user = { userId: 'user-123' };
    next();
  };
});

// Mock de Prisma PRIMERO
jest.mock('../lib/prisma', () => ({
  movie: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
}));

const request = require('supertest');
const app = require('../server');
const mockPrisma = require('../lib/prisma');

describe('Rating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ✅ Test: Actualizar rating (camino feliz)
  test('PATCH /api/movies/:id/rating - Actualizar rating a 5', async () => {
    const movieId = 'movie-1';
    mockPrisma.movie.findFirst.mockResolvedValue({
      id: movieId,
      title: 'Inception',
      rating: 0,
      ownerId: 'user-123',
    });
    mockPrisma.movie.update.mockResolvedValue({
      id: movieId,
      title: 'Inception',
      rating: 5,
      ownerId: 'user-123',
    });

    const res = await request(app)
      .patch(`/api/movies/${movieId}/rating`)
      .send({ rating: 5 });

    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(5);
    expect(mockPrisma.movie.update).toHaveBeenCalledWith({
      where: { id: movieId },
      data: { rating: 5 },
    });
  });

  // ✅ Test: Rating fuera de rango (mayor a 5)
  test('PATCH /api/movies/:id/rating - Rechazar rating > 5', async () => {
    const res = await request(app)
      .patch('/api/movies/movie-1/rating')
      .send({ rating: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('entre 0 y 5');
  });

  // ✅ Test: Rating negativo
  test('PATCH /api/movies/:id/rating - Rechazar rating negativo', async () => {
    const res = await request(app)
      .patch('/api/movies/movie-1/rating')
      .send({ rating: -1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('entre 0 y 5');
  });

  // ✅ Test: Película no encontrada
  test('PATCH /api/movies/:id/rating - Película no encontrada', async () => {
    mockPrisma.movie.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/movies/invalid-id/rating')
      .send({ rating: 3 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Película no encontrada');
  });

  // ✅ Test: Error del servidor
  test('PATCH /api/movies/:id/rating - Error del servidor', async () => {
    mockPrisma.movie.findFirst.mockRejectedValue(
      new Error('Database error')
    );

    const res = await request(app)
      .patch('/api/movies/movie-1/rating')
      .send({ rating: 3 });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error al actualizar el rating');
  });
});
