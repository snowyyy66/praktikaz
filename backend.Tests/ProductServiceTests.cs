using Backend.Models.Entities;
using Backend.Repositories;
using Backend.Services;
using Moq;
using FluentAssertions;
using Xunit;

namespace backend.Tests;

public class ProductServiceTests
{
    [Fact]
    public async Task GetProductsAsync_ShouldReturnPaginatedResults()
    {
        // Arrange
        var mockProductRepo = new Mock<IProductRepository>();
        var mockUserRepo = new Mock<IUserRepository>();
        var mockFavRepo = new Mock<IFavoriteRepository>();
        var mockAuctionRepo = new Mock<IAuctionRepository>();

        var products = new List<Product>
        {
            new Product { id = 1, title = "Test 1", seller_id = 101, is_active = 1 },
            new Product { id = 2, title = "Test 2", seller_id = 101, is_active = 1 }
        };

        mockProductRepo.Setup(r => r.GetProductsAsync(null, null, null, null, 1, 10))
            .ReturnsAsync(products);
        
        mockProductRepo.Setup(r => r.GetTotalCountAsync(null, null, null))
            .ReturnsAsync(2);

        var service = new ProductService(
            mockProductRepo.Object, 
            mockUserRepo.Object, 
            mockFavRepo.Object, 
            mockAuctionRepo.Object);

        // Act
        var result = await service.GetProductsAsync(null, null, null, null, 1, 10, null);

        // Assert
        result.Should().NotBeNull();
        result.items.Should().HaveCount(2);
        result.total_count.Should().Be(2);
        result.page.Should().Be(1);
    }
}
