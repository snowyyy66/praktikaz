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
        
        // Добавляем метаданные для каждой категории (поля, условия, шаги заказа)
        var metadata = new Dictionary<string, object>
        {
            ["transport"] = new {
                conditions = new object[] { "Б/У", "Новое" },
                fields = new object[] {
                    new { name = "Марка и модель", key = "brand" },
                    new { name = "Год выпуска", key = "year" },
                    new { name = "Пробег (км)", key = "mileage" },
                    new { name = "КПП", key = "transmission", options = new object[] { "Автомат", "Механика", "Робот", "Вариатор" } },
                    new { name = "Привод", key = "drive", options = new object[] { "Передний", "Задний", "Полный" } }
                },
                checkout_steps = 1 // Только подтверждение
            },
            ["realestate"] = new {
                conditions = new object[] { "Вторичка", "Новостройка" },
                fields = new object[] {
                    new { name = "Площадь (кв.м)", key = "area" },
                    new { name = "Количество комнат", key = "rooms", options = new object[] { "Студия", "1", "2", "3", "4+" } },
                    new { name = "Этаж", key = "floor" },
                    new { name = "Ремонт", key = "renovation", options = new object[] { "Черновая", "Чистовая", "Евро", "Дизайнерский" } }
                },
                checkout_steps = 1
            },
            ["rent"] = new {
                conditions = new object[] { "Аренда/сутки" },
                fields = new object[] {
                    new { name = "Мин. срок (часов)", key = "min_hours", number = true, min = 1, placeholder = "4" },
                    new { name = "Макс. срок (часов)", key = "max_hours", number = true, min = 1, placeholder = "72" },
                    new { name = "Залог / условия", key = "deposit" },
                    new { name = "Мин. стаж вождения", key = "min_experience" }
                },
                checkout_steps = 1
            },
            ["clothing"] = new {
                conditions = new object[] { "Новое", "Б/У" },
                fields = new object[] {
                    new { name = "Бренд", key = "brand" },
                    new { name = "Размер", key = "size" }
                },
                checkout_steps = 2 // Подтверждение + Адрес
            },
            ["items"] = new {
                conditions = new object[] { "Новое", "Б/У" },
                fields = new object[] {
                    new { name = "Бренд", key = "brand" }
                },
                checkout_steps = 2 // Подтверждение + Адрес
            },
            ["services"] = new {
                conditions = new object[] { "Услуга" },
                fields = (object[])null,
                checkout_steps = 3 // Подтверждение + Адрес + Время (12:00-20:00)
            }
        };

        var result = cats.Select(c => new {
            c.id,
            c.name,
            meta = metadata.ContainsKey(c.id) ? metadata[c.id] : null
        });

        return Ok(result);
    }
}
