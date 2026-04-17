using System.Text.Json;
using Backend.Services;

namespace Backend;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Add services to the container.
        builder.Services.AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            });
            
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();
        
        // CORS config identical to Node.js app.use(cors())
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowAll",
                b => b.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
        });

        // Register Database service
        builder.Services.AddSingleton<DbService>();

        var app = builder.Build();

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseCors("AllowAll");
        
        // Static files for uploads directory
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(
                Path.Combine(builder.Environment.ContentRootPath, "uploads")),
            RequestPath = "/uploads",
            OnPrepareResponse = ctx =>
            {
                ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", "*");
            }
        });

        app.UseAuthorization();

        app.MapControllers();

        // Migration hack for new notification layout
        var db = app.Services.GetRequiredService<DbService>();
        try { db.ExecuteAsync("ALTER TABLE notifications ADD COLUMN related_user_id INTEGER;").Wait(); } catch {}
        try { db.ExecuteAsync("ALTER TABLE notifications ADD COLUMN related_product_id INTEGER;").Wait(); } catch {}
        try { db.ExecuteAsync("CREATE TABLE IF NOT EXISTS product_views (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, user_id INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(product_id, user_id));").Wait(); } catch {}

        // Start on port 3000 to match old server
        app.Run("http://localhost:3000");
    }
}
