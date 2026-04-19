using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;

namespace Marketplace.Api.Middleware;

// Превращает исключения в ответ JSON { error: "..." }: бизнес-правила → 400, остальное → 500.
public sealed class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;
    private readonly IWebHostEnvironment _env;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger, IWebHostEnvironment env)
    {
        _logger = logger;
        _env = env;
    }

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is DbUpdateException dbEx)
        {
            _logger.LogWarning(dbEx, "Database update");
            var inner = dbEx.InnerException?.Message ?? dbEx.Message;
            var duplicate = inner.Contains("UNIQUE", StringComparison.OrdinalIgnoreCase)
                || inner.Contains("unique constraint", StringComparison.OrdinalIgnoreCase);
            httpContext.Response.StatusCode = duplicate
                ? StatusCodes.Status400BadRequest
                : StatusCodes.Status500InternalServerError;
            var msg = duplicate
                ? "Такая запись уже существует (ограничение уникальности в базе)"
                : "Ошибка сохранения в базу данных";
            if (_env.IsDevelopment())
                await httpContext.Response.WriteAsJsonAsync(new { error = msg, detail = inner }, cancellationToken);
            else
                await httpContext.Response.WriteAsJsonAsync(new { error = msg }, cancellationToken);
            return true;
        }

        if (exception is InvalidOperationException biz)
        {
            _logger.LogWarning(biz, "Business rule");
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await httpContext.Response.WriteAsJsonAsync(new { error = biz.Message }, cancellationToken);
            return true;
        }

        if (exception is ArgumentException arg)
        {
            _logger.LogWarning(arg, "Bad argument");
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await httpContext.Response.WriteAsJsonAsync(new { error = arg.Message }, cancellationToken);
            return true;
        }

        _logger.LogError(exception, "Unhandled");
        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        if (_env.IsDevelopment())
        {
            await httpContext.Response.WriteAsJsonAsync(
                new { error = "Внутренняя ошибка сервера", detail = exception.Message },
                cancellationToken);
        }
        else
        {
            await httpContext.Response.WriteAsJsonAsync(new { error = "Внутренняя ошибка сервера" }, cancellationToken);
        }

        return true;
    }
}
