const asyncHandler = require("express-async-handler");
const Note = require("../models/Note");
const { success, error } = require("../utils/response");
const { toObjectId } = require("../utils/currency");

const getNotes = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 100,
    categoryTag,
    search,
    pinned,
    sort = "-pinned,-position,-updatedAt",
  } = req.query;

  const query = { userId: toObjectId(req.user._id) };
  if (categoryTag) query.categoryTag = categoryTag;
  if (pinned === "true") query.pinned = true;
  if (pinned === "false") query.pinned = false;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { body: { $regex: search, $options: "i" } },
      { "items.text": { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Note.countDocuments(query);
  const items = await Note.find(query).sort(sort).skip(skip).limit(Number(limit));

  const byCategory = await Note.aggregate([
    { $match: { userId: toObjectId(req.user._id) } },
    { $group: { _id: "$categoryTag", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const pinnedCount = await Note.countDocuments({
    userId: toObjectId(req.user._id),
    pinned: true,
  });

  return success(res, {
    items,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
    byCategory,
    pinnedCount,
  });
});

const createNote = asyncHandler(async (req, res) => {
  const { title, body, icon, categoryTag, image, images, links, color, pinned, items, column } =
    req.body;
  if (!title?.trim()) return error(res, "Title is required", 400);

  const maxPos = await Note.findOne({ userId: toObjectId(req.user._id) })
    .sort("-position")
    .select("position");

  const note = await Note.create({
    userId: toObjectId(req.user._id),
    title: title.trim(),
    body: body || "",
    icon: icon || "📝",
    categoryTag: categoryTag || "General",
    image: image || "",
    images: images || [],
    links: links || [],
    color: color || "default",
    pinned: !!pinned,
    items: items || [],
    position: (maxPos?.position || 0) + 1,
    column: column || 0,
  });

  return success(res, note, "Note created successfully", 201);
});

const updateNote = asyncHandler(async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.id,
    userId: toObjectId(req.user._id),
  });
  if (!note) return error(res, "Note not found", 404);

  const fields = [
    "title", "body", "icon", "categoryTag", "image", "images",
    "links", "color", "pinned", "items", "position", "column",
  ];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) note[f] = req.body[f];
  });
  await note.save();
  return success(res, note, "Note updated successfully");
});

const togglePin = asyncHandler(async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.id,
    userId: toObjectId(req.user._id),
  });
  if (!note) return error(res, "Note not found", 404);
  note.pinned = !note.pinned;
  await note.save();
  return success(res, note, note.pinned ? "Note pinned" : "Note unpinned");
});

const deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findOneAndDelete({
    _id: req.params.id,
    userId: toObjectId(req.user._id),
  });
  if (!note) return error(res, "Note not found", 404);
  return success(res, null, "Note deleted successfully");
});

const deleteAllNotes = asyncHandler(async (req, res) => {
  const result = await Note.deleteMany({ userId: toObjectId(req.user._id) });
  return success(res, { deleted: result.deletedCount }, `Deleted ${result.deletedCount} notes`);
});

const exportNotes = asyncHandler(async (req, res) => {
  const items = await Note.find({ userId: toObjectId(req.user._id) }).sort(
    "-pinned,-position"
  );
  return success(res, items, "Notes exported");
});


const toggleChecklistItem = asyncHandler(async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.id,
    userId: toObjectId(req.user._id),
  });
  if (!note) return error(res, "Note not found", 404);
  const itemId = req.params.itemId;
  const item = note.items.id(itemId);
  if (!item) return error(res, "Checklist item not found", 404);
  item.checked = !item.checked;
  await note.save();
  return success(res, note, "Checklist updated");
});

const duplicateNote = asyncHandler(async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.id,
    userId: toObjectId(req.user._id),
  });
  if (!note) return error(res, "Note not found", 404);
  const maxPos = await Note.findOne({ userId: toObjectId(req.user._id) })
    .sort("-position")
    .select("position");
  const copy = await Note.create({
    userId: toObjectId(req.user._id),
    title: `${note.title} (copy)`,
    body: note.body,
    icon: note.icon,
    categoryTag: note.categoryTag,
    image: note.image,
    images: note.images,
    links: note.links,
    color: note.color,
    pinned: false,
    items: note.items.map((i) => ({ text: i.text, checked: false, order: i.order })),
    position: (maxPos?.position || 0) + 1,
    column: note.column,
  });
  return success(res, copy, "Note duplicated", 201);
});

module.exports = {
  getNotes,
  createNote,
  updateNote,
  togglePin,
  toggleChecklistItem,
  duplicateNote,
  deleteNote,
  deleteAllNotes,
  exportNotes,
};
