using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/categories")]
public class CategoriesController : ControllerBase
{
    private readonly DbService _db;

    public CategoriesController(DbService db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetCategories()
    {
        var cats = await _db.QueryAsync<Category>("SELECT * FROM categories");
        return Ok(cats);
    }
}
