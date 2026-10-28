#!/usr/bin/env python3
"""Generate MongoDB Lab Exercises PDF with queries and screenshots."""

from pathlib import Path
from fpdf import FPDF

DOCS = Path(__file__).resolve().parent
OUT = DOCS / "MongoDB_Lab_Exercises.pdf"

SCREENSHOTS = {
    10: DOCS / "screenshot_task10.png",
    21: DOCS / "screenshot_task21_a.png",
}

TASKS = [
    (
        1,
        "Find one movie document",
        'db.movies.findOne({})',
    ),
    (
        2,
        "Movies from year 2000 (title & year only)",
        """db.movies.find(
    { year: 2000 },
    { title: 1, year: 1, _id: 0 }
)""",
    ),
    (
        3,
        "Count PG-13 rated movies",
        'db.movies.countDocuments({ rated: "PG-13" })',
    ),
    (
        4,
        "Movies with runtime greater than 180",
        """db.movies.find({
    runtime: { $gt: 180 }
})""",
    ),
    (
        5,
        "Top 5 longest movies (numeric runtime)",
        """db.movies.find({
    runtime: { $type: "number" }
}).sort({ runtime: -1 }).limit(5)""",
    ),
    (
        6,
        "Movies with genre Comedy",
        """db.movies.find({
    genres: "Comedy"
})""",
    ),
    (
        7,
        "Movies featuring Tom Hanks (find + count)",
        """db.movies.find({
    cast: "Tom Hanks"
})

db.movies.countDocuments({
    cast: "Tom Hanks"
})""",
    ),
    (
        8,
        "Insert one document into my_movies_tushar",
        """db.my_movies_tushar.insertOne({
  title: "The Dark Knight",
  year: 2008,
  runtime: 148,
  genres: ["Action", "Sci-Fi"],
  rated: "PG-13",
  directors: ["Christopher Nolan"]
})""",
    ),
    (
        9,
        "Insert many documents into my_movies_tushar",
        """db.my_movies_tushar.insertMany([
  {
    title: "Inception",
    year: 2010,
    runtime: 152,
    genres: ["Action", "Sci-Fi"],
    rated: "PG-13",
    directors: ["Christopher Nolan"]
  },
  {
    title: "Dhurandhar",
    year: 2010,
    runtime: 200,
    genres: ["Action", "Crime", "Drama"],
    rated: "A",
    directors: ["Christopher Nolan"]
  },
  {
    title: "Interstellar",
    year: 2010,
    runtime: 180,
    genres: ["Action", "Sci-Fi", "Romance"],
    rated: "PG-13",
    directors: ["Christopher Nolan"]
  }
])""",
    ),
    (
        10,
        "Find and update Dhurandhar (rated + directors)",
        """db.my_movies_tushar.find({ title: "Dhurandhar" })

db.my_movies_tushar.updateOne(
  { title: "Dhurandhar" },
  { $set: { rated: "PG" } }
)

db.my_movies_tushar.updateOne(
  { title: "Dhurandhar" },
  { $set: { directors: "Aditya Dhar" } }
)

db.my_movies_tushar.find({ title: "Dhurandhar" })""",
    ),
    (
        11,
        "Drama/Romance movies from 1990-1999",
        """db.movies.find({
  genres: { $in: ["Drama", "Romance"] },
  year: { $gte: 1990, $lte: 1999 }
})""",
    ),
    (
        12,
        "Movies that are both Action and Sci-Fi",
        """db.movies.find({
  genres: { $all: ["Action", "Sci-Fi"] }
})""",
    ),
    (
        13,
        "High-rated movies with many IMDb votes",
        """db.movies.find(
  {
    "imdb.rating": { $gte: 8.5 },
    "imdb.votes": { $gt: 100000 }
  },
  { title: 1, "imdb.rating": 1, _id: 0 }
).sort({ "imdb.rating": -1 })""",
    ),
    (
        14,
        "Titles starting with 'The Lord'",
        """db.movies.find({
  title: { $regex: "^The Lord" }
})""",
    ),
    (
        15,
        "Movies missing the rated field",
        """db.movies.find({
  rated: { $exists: false }
})""",
    ),
    (
        16,
        "Count Indian movies after 2010",
        """db.movies.countDocuments({
  countries: "India",
  year: { $gt: 2010 }
})""",
    ),
    (
        17,
        "Comedy movies - sorted, skip 20, limit 10",
        """db.movies.find({ genres: "Comedy" })
  .sort({ title: 1 })
  .skip(20)
  .limit(10)""",
    ),
    (
        18,
        "Increment views on all my_movies_tushar docs",
        """db.my_movies_tushar.find()

db.my_movies_tushar.updateMany({}, { $inc: { views: 1 } })""",
    ),
    (
        19,
        "Push Thriller genre onto Dhurandhar",
        """db.my_movies_tushar.find({ title: "Dhurandhar" })

db.my_movies_tushar.updateOne(
  { title: "Dhurandhar" },
  { $push: { genres: "Thriller" } }
)""",
    ),
    (
        20,
        "Delete all PG-rated docs from my_movies_tushar",
        """db.my_movies_tushar.find({ rated: "PG" })

db.my_movies_tushar.deleteMany({ rated: "PG" })""",
    ),
    (
        21,
        "Top 10 genres by movie count",
        """db.movies.aggregate([
  { $unwind: "$genres" },
  { $group: { _id: "$genres", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 10 }
])""",
    ),
    (
        22,
        "Average runtime by rating",
        """db.movies.aggregate([
  { $match: { runtime: { $type: "number" } } },
  { $group: { _id: "$rated", avgRuntime: { $avg: "$runtime" } } },
  { $sort: { avgRuntime: -1 } }
])""",
    ),
    (
        23,
        "Lookup comments for The Godfather",
        """db.movies.aggregate([
  { $match: { title: "The Godfather" } },
  { $lookup: {
      from: "comments",
      localField: "_id",
      foreignField: "movie_id",
      as: "comments"
  } }
])""",
    ),
    (24, "Task 24 (pending)", "// TODO"),
    (25, "Task 25 (pending)", "// TODO"),
    (26, "Task 26 (pending)", "// TODO"),
    (
        27,
        "Directors with more than 20 movies",
        """db.movies.aggregate([
  { $unwind: "$directors" },
  { $group: { _id: "$directors", movieCount: { $sum: 1 } } },
  { $match: { movieCount: { $gt: 20 } } },
  { $sort: { movieCount: -1 } }
])""",
    ),
    (
        28,
        "Countries with 500+ movies + avg IMDb rating",
        """db.movies.aggregate([
  { $unwind: "$countries" },
  { $group: {
      _id: "$countries",
      movieCount: { $sum: 1 },
      avgRating: { $avg: "$imdb.rating" }
  } },
  { $match: { movieCount: { $gte: 500 } } },
  { $sort: { movieCount: -1 } }
])""",
    ),
]


class PDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, "MongoDB Lab Exercises - sample_mflix", align="L")
        self.cell(0, 8, f"Page {self.page_no()}", align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(200, 200, 200)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(140, 140, 140)
        self.cell(0, 8, "Database: sample_mflix | Collections: movies, comments, my_movies_tushar", align="C")


def add_code_block(pdf: PDF, code: str):
    pdf.set_fill_color(245, 247, 250)
    pdf.set_draw_color(220, 224, 230)
    pdf.set_font("Courier", size=8.5)
    pdf.set_text_color(30, 30, 30)
    # Estimate height
    lines = code.splitlines() or [""]
    line_h = 4.2
    pad = 3
    block_h = len(lines) * line_h + pad * 2
    # Page break if needed
    if pdf.get_y() + block_h > pdf.h - 20:
        pdf.add_page()
    x = pdf.get_x()
    y = pdf.get_y()
    pdf.rect(x, y, 190, block_h, style="DF")
    pdf.set_xy(x + 3, y + pad)
    for line in lines:
        # Avoid empty-line issues with multi_cell
        safe = line.replace("\t", "  ") or " "
        pdf.cell(184, line_h, safe, new_x="LMARGIN", new_y="NEXT")
        pdf.set_x(x + 3)
    pdf.set_y(y + block_h + 3)


def add_screenshot(pdf: PDF, path: Path, caption: str):
    if not path.exists():
        return
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 10)
    self_y = pdf.get_y()
    # Leave room for image (~90mm) + caption
    if self_y + 100 > pdf.h - 20:
        pdf.add_page()
    pdf.set_text_color(40, 40, 40)
    pdf.cell(0, 6, caption, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)
    # Fit image to page width
    max_w = 190
    pdf.image(str(path), w=max_w)
    pdf.ln(4)


def build():
    pdf = PDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    # Cover
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(20, 40, 70)
    pdf.ln(20)
    pdf.cell(0, 12, "MongoDB Lab Exercises", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", size=12)
    pdf.set_text_color(80, 80, 80)
    pdf.ln(4)
    pdf.cell(0, 8, "Database: sample_mflix", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 8, "Cluster: cluster0.5qruewy.mongodb.net", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 8, "User: tusharverma_db_user", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)
    pdf.set_font("Helvetica", size=11)
    pdf.multi_cell(
        0,
        6,
        "This document contains MongoDB find, update, aggregate, and CRUD "
        "queries executed against the sample_mflix dataset, plus a custom "
        "collection my_movies_tushar. Screenshots from MongoDB Compass are "
        "attached for selected tasks.",
        align="C",
    )
    pdf.ln(10)
    pdf.set_draw_color(20, 40, 70)
    pdf.line(40, pdf.get_y(), 170, pdf.get_y())
    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(20, 40, 70)
    pdf.cell(0, 8, "Contents", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", size=10)
    pdf.set_text_color(50, 50, 50)
    pdf.ln(2)
    toc = [
        "Tasks 1-7   - Find / count / filter / sort",
        "Tasks 8-10  - Insert & update (my_movies_tushar)",
        "Tasks 11-17 - Advanced queries ($in, $all, $regex, skip/limit)",
        "Tasks 18-20 - updateMany / $push / deleteMany",
        "Tasks 21-23 - Aggregations ($unwind, $group, $lookup)",
        "Tasks 24-26 - Pending",
        "Tasks 27-28 - Director & country aggregations",
    ]
    for item in toc:
        pdf.cell(0, 6, item, align="C", new_x="LMARGIN", new_y="NEXT")

    # Tasks
    pdf.add_page()
    for num, title, code in TASKS:
        # Task heading
        needed = 20 + (code.count("\n") + 1) * 4.5
        if num in SCREENSHOTS:
            needed += 95
        if pdf.get_y() + min(needed, 40) > pdf.h - 20:
            pdf.add_page()

        pdf.set_fill_color(20, 40, 70)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(14, 8, f"#{num}", fill=True, align="C")
        pdf.set_fill_color(232, 238, 247)
        pdf.set_text_color(20, 40, 70)
        pdf.cell(176, 8, f"  {title}", fill=True, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)

        if code.strip() != "// TODO":
            add_code_block(pdf, code)
        else:
            pdf.set_font("Helvetica", "I", 10)
            pdf.set_text_color(120, 120, 120)
            pdf.cell(0, 6, "No query provided yet.", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(2)

        if num in SCREENSHOTS:
            add_screenshot(
                pdf,
                SCREENSHOTS[num],
                f"Screenshot - Task {num} (MongoDB Compass)",
            )
            # Extra screenshot for task 21 results
            if num == 21:
                extra = DOCS / "screenshot_task21_b.png"
                if extra.exists():
                    add_screenshot(
                        pdf,
                        extra,
                        "Screenshot - Task 21 results (top genres)",
                    )

        pdf.ln(4)

    pdf.output(str(OUT))
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
