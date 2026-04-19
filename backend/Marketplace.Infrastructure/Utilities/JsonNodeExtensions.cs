using System.Text.Json.Nodes;

namespace Marketplace.Infrastructure.Utilities;

public static class JsonNodeExtensions
{
    public static JsonNode ParseOrEmpty(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new JsonObject();
        try { return JsonNode.Parse(json)!; }
        catch { return new JsonObject(); }
    }

    public static JsonNode ParseOrEmptyArray(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new JsonArray();
        try { return JsonNode.Parse(json)!; }
        catch { return new JsonArray(); }
    }
}
