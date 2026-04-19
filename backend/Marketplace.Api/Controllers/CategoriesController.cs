using Marketplace.Application.Abstractions;
using Microsoft.AspNetCore.Mvc;

namespace Marketplace.Api.Controllers;

// Справочник категорий для форм и фильтров на фронте.
[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _svc;

    public CategoriesController(ICategoryService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) =>
        Ok(await _svc.GetAllAsync(ct));
}
