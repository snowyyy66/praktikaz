using Backend.Models.Entities;
using Backend.Repositories;
using Backend.Services;
using FluentAssertions;
using Moq;
using Xunit;

namespace backend.Tests;

public class ReviewServiceTests
{
    private readonly Mock<IReviewRepository> _reviewRepo = new();
    private ReviewService CreateService() => new(_reviewRepo.Object);

    [Fact]
    public async Task CreateReview_ShouldThrow_WhenRatingOutOfRange()
    {
        var svc = CreateService();
        var act = async () => await svc.CreateReviewAsync(1, 1, 6, "text", null);
        await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Рейтинг*");
    }

    [Fact]
    public async Task CreateReview_ShouldThrow_WhenProductNotFound()
    {
        _reviewRepo.Setup(r => r.GetSellerIdForProductAsync(It.IsAny<long>())).ReturnsAsync(0);
        var svc = CreateService();
        var act = async () => await svc.CreateReviewAsync(1, 999, 4, "text", null);
        await act.Should().ThrowAsync<ArgumentException>().WithMessage("*Товар не найден*");
    }

    [Fact]
    public async Task CreateReview_ShouldSave_WhenValid()
    {
        _reviewRepo.Setup(r => r.GetSellerIdForProductAsync(10)).ReturnsAsync(5);
        _reviewRepo.Setup(r => r.AddAsync(It.IsAny<Review>())).Returns(Task.CompletedTask);

        var svc = CreateService();
        await svc.CreateReviewAsync(2, 10, 5, "Отлично", null);

        _reviewRepo.Verify(r => r.AddAsync(It.Is<Review>(rev =>
            rev.reviewer_id == 2 && rev.product_id == 10 && rev.rating == 5 && rev.target_user_id == 5
        )), Times.Once);
    }

    [Fact]
    public async Task CheckReview_ShouldThrow_WhenParamsInvalid()
    {
        var svc = CreateService();
        var act = async () => await svc.CheckReviewAsync(0, 5);
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task UpdateReview_ShouldThrow_WhenReviewNotFound()
    {
        _reviewRepo.Setup(r => r.GetByIdAsync(It.IsAny<long>())).ReturnsAsync((Review?)null);
        var svc = CreateService();
        var act = async () => await svc.UpdateReviewAsync(999, 4, "text", null);
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }
}
