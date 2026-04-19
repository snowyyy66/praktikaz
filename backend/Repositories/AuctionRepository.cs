using Backend.Data;
using Backend.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Repositories;

public interface IAuctionRepository
{
    Task<IEnumerable<dynamic>> GetBidsAsync(long productId);
    Task AddBidAsync(AuctionBid bid);
    Task<long> GetHighBidAsync(long productId);
}

public class AuctionRepository : IAuctionRepository
{
    private readonly AppDbContext _context;
    public AuctionRepository(AppDbContext context) => _context = context;

    public async Task<IEnumerable<dynamic>> GetBidsAsync(long productId)
    {
        return await (from b in _context.AuctionBids
                      join u in _context.Users on b.bidder_id equals u.id
                      where b.product_id == productId
                      orderby b.created_at descending, b.id descending
                      select new
                      {
                          b.id,
                          b.amount,
                          b.created_at,
                          bidder_name = u.username
                      }).Take(30).ToListAsync();
    }

    public async Task AddBidAsync(AuctionBid bid)
    {
        await _context.AuctionBids.AddAsync(bid);
        await _context.SaveChangesAsync();
    }

    public async Task<long> GetHighBidAsync(long productId)
    {
        return await _context.AuctionBids
            .Where(b => b.product_id == productId)
            .Select(b => b.amount)
            .DefaultIfEmpty(0)
            .MaxAsync();
    }
}
