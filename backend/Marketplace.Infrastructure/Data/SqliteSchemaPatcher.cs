using Marketplace.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Marketplace.Infrastructure.Data;

/// <summary>
/// Старая ручная marketplace.db без миграций: <c>EnsureCreated</c> не меняет существующие таблицы.
/// Добавляем недостающие колонки под актуальную модель EF (SQLite <c>ALTER TABLE ADD COLUMN</c>).
/// </summary>
public static class SqliteSchemaPatcher
{
    private static readonly (string Table, string Column, string SqlType)[] Columns =
    [
        ("Users", "IsAdmin", "INTEGER NOT NULL DEFAULT 0"),
        ("Notifications", "IsRead", "INTEGER NOT NULL DEFAULT 0"),
    ];

    public static async Task ApplyMissingColumnsAsync(AppDbContext db, CancellationToken ct = default)
    {
        var conn = db.Database.GetDbConnection();
        await conn.OpenAsync(ct).ConfigureAwait(false);
        try
        {
            foreach (var (table, column, sqlType) in Columns)
                await TryAddColumnAsync(conn, table, column, sqlType, ct).ConfigureAwait(false);
        }
        finally
        {
            await conn.CloseAsync().ConfigureAwait(false);
        }
    }

    private static async Task TryAddColumnAsync(System.Data.Common.DbConnection conn, string table, string column, string sqlType, CancellationToken ct)
    {
        if (!await TableExistsAsync(conn, table, ct).ConfigureAwait(false))
            return;

        if (await ColumnExistsAsync(conn, table, column, ct).ConfigureAwait(false))
            return;

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"ALTER TABLE \"{table}\" ADD COLUMN \"{column}\" {sqlType}";
        await cmd.ExecuteNonQueryAsync(ct).ConfigureAwait(false);
    }

    private static async Task<bool> TableExistsAsync(System.Data.Common.DbConnection conn, string table, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=@name;";
        var p = cmd.CreateParameter();
        p.ParameterName = "@name";
        p.Value = table;
        cmd.Parameters.Add(p);
        var scalar = await cmd.ExecuteScalarAsync(ct).ConfigureAwait(false);
        return scalar is long l ? l > 0 : Convert.ToInt64(scalar ?? 0, System.Globalization.CultureInfo.InvariantCulture) > 0;
    }

    private static async Task<bool> ColumnExistsAsync(System.Data.Common.DbConnection conn, string table, string column, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"PRAGMA table_info(\"{table}\");";
        await using var reader = await cmd.ExecuteReaderAsync(ct).ConfigureAwait(false);
        while (await reader.ReadAsync(ct).ConfigureAwait(false))
        {
            var name = reader.GetString(1);
            if (string.Equals(name, column, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }
}
