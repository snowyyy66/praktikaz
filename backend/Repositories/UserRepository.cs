using Backend.Data;
using Backend.Models.Entities;

namespace Backend.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(long id);
}

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;
    public UserRepository(AppDbContext context) => _context = context;
    public async Task<User?> GetByIdAsync(long id) => await _context.Users.FindAsync(id);
}
