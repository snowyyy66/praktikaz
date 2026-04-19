using Backend.Models.Entities;
using Backend.Repositories;
using Backend.Services;
using FluentAssertions;
using Moq;
using Xunit;

namespace backend.Tests;

public class ConversationServiceTests
{
    private readonly Mock<IConversationRepository> _convRepo = new();
    private ConversationService CreateService() => new(_convRepo.Object);

    [Fact]
    public async Task CreateOrGetConversation_ShouldThrow_WhenSameUser()
    {
        var svc = CreateService();
        var act = async () => await svc.CreateOrGetConversationAsync(5, 5, null);
        await act.Should().ThrowAsync<ArgumentException>().WithMessage("*участники*");
    }

    [Fact]
    public async Task CreateOrGetConversation_ShouldReturnExistingId_WhenAlreadyExists()
    {
        _convRepo.Setup(r => r.FindExistingAsync(1, 2, null))
            .ReturnsAsync(new Conversation { id = 10, user1_id = 1, user2_id = 2 });

        var svc = CreateService();
        var id = await svc.CreateOrGetConversationAsync(2, 1, null);

        id.Should().Be(10);
        _convRepo.Verify(r => r.CreateAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<int?>()), Times.Never);
    }

    [Fact]
    public async Task CreateOrGetConversation_ShouldCreateNew_WhenNotExists()
    {
        _convRepo.Setup(r => r.FindExistingAsync(1, 3, null)).ReturnsAsync((Conversation?)null);
        _convRepo.Setup(r => r.CreateAsync(1, 3, null)).ReturnsAsync(99);

        var svc = CreateService();
        var id = await svc.CreateOrGetConversationAsync(1, 3, null);

        id.Should().Be(99);
    }

    [Fact]
    public async Task SendMessage_ShouldThrow_WhenEmptyText()
    {
        var svc = CreateService();
        var act = async () => await svc.SendMessageAsync(1, 1, "   ");
        await act.Should().ThrowAsync<ArgumentException>().WithMessage("*сообщение*");
    }

    [Fact]
    public async Task SendMessage_ShouldThrow_WhenConversationNotFound()
    {
        _convRepo.Setup(r => r.GetByIdAsync(It.IsAny<long>())).ReturnsAsync((Conversation?)null);
        var svc = CreateService();
        var act = async () => await svc.SendMessageAsync(999, 1, "hello");
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }
}
