using Backend.Repositories;

namespace Backend.Services;

public interface ICategoryService
{
    Task<IEnumerable<object>> GetCategoriesAsync();
}

public class CategoryService : ICategoryService
{
    private readonly ICategoryRepository _categoryRepository;

    public CategoryService(ICategoryRepository categoryRepository)
    {
        _categoryRepository = categoryRepository;
    }

    public async Task<IEnumerable<object>> GetCategoriesAsync()
    {
        var cats = await _categoryRepository.GetAllAsync();

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
                checkout_steps = 1
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
                checkout_steps = 2
            },
            ["items"] = new {
                conditions = new object[] { "Новое", "Б/У" },
                fields = new object[] {
                    new { name = "Бренд", key = "brand" }
                },
                checkout_steps = 2
            },
            ["services"] = new {
                conditions = new object[] { "Услуга" },
                fields = (object[]?)null,
                checkout_steps = 3
            }
        };

        return cats.Select(c => (object)new
        {
            c.id,
            c.name,
            meta = metadata.TryGetValue(c.id ?? "", out var m) ? m : null
        });
    }
}
