using System.Data;
using Dapper;
using Microsoft.Data.Sqlite;

namespace Backend.Services;

public class DbService
{
    private readonly string _connectionString;

    public DbService(IConfiguration config)
    {
        var dbPath = Path.Combine(Directory.GetCurrentDirectory(), "marketplace.db");
        _connectionString = $"Data Source={dbPath};Cache=Shared";
    }

    public IDbConnection CreateConnection()
    {
        return new SqliteConnection(_connectionString);
    }
    
    // Вспомогательный метод для получения скалярного значения или первой строки
    public async Task<T?> QueryFirstOrDefaultAsync<T>(string sql, object? param = null)
    {
        using var connection = CreateConnection();
        return await connection.QueryFirstOrDefaultAsync<T>(sql, param);
    }

    // Вспомогательный метод для получения списка
    public async Task<IEnumerable<T>> QueryAsync<T>(string sql, object? param = null)
    {
        using var connection = CreateConnection();
        return await connection.QueryAsync<T>(sql, param);
    }

    // Выполнение команд (INSERT, UPDATE, DELETE)
    public async Task<int> ExecuteAsync(string sql, object? param = null)
    {
        using var connection = CreateConnection();
        return await connection.ExecuteAsync(sql, param);
    }
}
