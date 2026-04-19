using Backend.Models.Entities;
using Backend.Repositories;
using Backend.Services;
using FluentAssertions;
using Moq;
using Xunit;

namespace backend.Tests;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _userRepo = new();
    private AuthService CreateService() => new(_userRepo.Object);

    [Fact]
    public async Task Register_ShouldReturnUserId_WhenCredentialsAreNew()
    {
        _userRepo.Setup(r => r.ExistsAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(false);

        var newUser = new User { id = 42, is_admin = 0 };
        _userRepo.Setup(r => r.AddAsync(It.IsAny<User>()))
            .Callback<User>(u => u.id = 42)
            .Returns(Task.CompletedTask);

        var svc = CreateService();
        var (userId, isAdmin) = await svc.RegisterAsync("test_user", "test@example.com", "password123");

        userId.Should().Be(42);
        isAdmin.Should().BeFalse();
        _userRepo.Verify(r => r.AddAsync(It.IsAny<User>()), Times.Once);
    }

    [Fact]
    public async Task Register_ShouldThrow_WhenUserAlreadyExists()
    {
        _userRepo.Setup(r => r.ExistsAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        var svc = CreateService();
        var act = async () => await svc.RegisterAsync("existing", "existing@example.com", "pass");

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*уже существует*");
    }

    [Fact]
    public async Task Register_ShouldThrow_WhenFieldsAreEmpty()
    {
        var svc = CreateService();
        var act = async () => await svc.RegisterAsync("", "email@test.com", "pass");
        await act.Should().ThrowAsync<ArgumentException>().WithMessage("*обязательны*");
    }

    [Fact]
    public async Task Login_ShouldReturnUserData_WhenCredentialsAreCorrect()
    {
        var hash = BCrypt.Net.BCrypt.HashPassword("correctpass");
        _userRepo.Setup(r => r.FindByEmailAsync("user@test.com"))
            .ReturnsAsync(new User { id = 5, email = "user@test.com", password = hash, is_admin = 0 });

        var svc = CreateService();
        var (userId, isAdmin) = await svc.LoginAsync("user@test.com", "correctpass");

        userId.Should().Be(5);
        isAdmin.Should().BeFalse();
    }

    [Fact]
    public async Task Login_ShouldThrow_WhenEmailNotFound()
    {
        _userRepo.Setup(r => r.FindByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        var svc = CreateService();
        var act = async () => await svc.LoginAsync("unknown@test.com", "pass");
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Login_ShouldThrow_WhenPasswordIsWrong()
    {
        var hash = BCrypt.Net.BCrypt.HashPassword("correctpass");
        _userRepo.Setup(r => r.FindByEmailAsync("user@test.com"))
            .ReturnsAsync(new User { id = 1, email = "user@test.com", password = hash, is_admin = 0 });

        var svc = CreateService();
        var act = async () => await svc.LoginAsync("user@test.com", "wrongpass");
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }
}
