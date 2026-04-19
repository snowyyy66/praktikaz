using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/reviews")]
public class ReviewsController : ControllerBase
{
    private readonly IReviewService _reviewService;
    private readonly IWebHostEnvironment _env;

    public ReviewsController(IReviewService reviewService, IWebHostEnvironment env)
    {
        _reviewService = reviewService;
        _env = env;
    }

    public class ReviewRequest
    {
        public int reviewer_id { get; set; }
        public int product_id { get; set; }
        public int rating { get; set; }
        public string? text { get; set; }
        public string[]? images { get; set; }
    }

    [HttpGet("check")]
    public async Task<IActionResult> CheckReview([FromQuery] int user_id, [FromQuery] int product_id)
    {
        var result = await _reviewService.CheckReviewAsync(user_id, product_id);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateReview([FromBody] ReviewRequest req)
    {
        await _reviewService.CreateReviewAsync(req.reviewer_id, req.product_id, req.rating, req.text, req.images);
        return StatusCode(201, new { success = true });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateReview(long id, [FromBody] ReviewRequest req)
    {
        await _reviewService.UpdateReviewAsync(id, req.rating, req.text, req.images);
        return Ok(new { success = true });
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadReviewMedia([FromForm] IFormFileCollection images)
    {
        var paths = await _reviewService.UploadMediaAsync(images, _env.ContentRootPath);
        return Ok(new { images = paths });
    }

    [HttpGet]
    public async Task<IActionResult> GetProductReviews([FromQuery] long product_id)
    {
        var reviews = await _reviewService.GetByProductAsync(product_id);
        return Ok(reviews);
    }

    [HttpGet("seller/{id}")]
    public async Task<IActionResult> GetUserReviews(long id)
    {
        var reviews = await _reviewService.GetBySellerAsync(id);
        return Ok(reviews);
    }

    [HttpGet("reviewer/{id}")]
    public async Task<IActionResult> GetReviewsByReviewer(long id)
    {
        var reviews = await _reviewService.GetByReviewerAsync(id);
        return Ok(reviews);
    }
}
