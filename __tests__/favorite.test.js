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

describe('Favoritos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ✅ Test: Toggle favorito (camino feliz)
  test('PATCH /api/movies/:id/favorite - Marcar como favorito', async () => {
    const movieId = 'movie-1';
    mockPrisma.movie.findFirst.mockResolvedValue({
      id: movieId,
      title: 'Inception',
      isFavorite: false,
      ownerId: 'user-123',
    });
    mockPrisma.movie.update.mockResolvedValue({
      id: movieId,
      title: 'Inception',
      isFavorite: true,
      ownerId: 'user-123',
    });

    const res = await request(app)
      .patch(`/api/movies/${movieId}/favorite`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.isFavorite).toBe(true);
    expect(mockPrisma.movie.update).toHaveBeenCalledWith({
      where: { id: movieId },
      data: { isFavorite: true },
    });
  });

  // ✅ Test: Desmarcar como favorito
  test('PATCH /api/movies/:id/favorite - Desmarcar favorito', async () => {
    const movieId = 'movie-1';
    mockPrisma.movie.findFirst.mockResolvedValue({
      id: movieId,
      title: 'Inception',
      isFavorite: true,
      ownerId: 'user-123',
    });
    mockPrisma.movie.update.mockResolvedValue({
      id: movieId,
      title: 'Inception',
      isFavorite: false,
      ownerId: 'user-123',
    });

    const res = await request(app)
      .patch(`/api/movies/${movieId}/favorite`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.isFavorite).toBe(false);
  });

  // ✅ Test: Película no encontrada
  test('PATCH /api/movies/:id/favorite - Película no encontrada', async () => {
    mockPrisma.movie.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/movies/invalid-id/favorite')
      .send();

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Película no encontrada');
  });

  // ✅ Test: Error del servidor
  test('PATCH /api/movies/:id/favorite - Error del servidor', async () => {
    mockPrisma.movie.findFirst.mockRejectedValue(
      new Error('Database error')
    );

    const res = await request(app)
      .patch('/api/movies/movie-1/favorite')
      .send();

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error al actualizar favorito');
  });
});
