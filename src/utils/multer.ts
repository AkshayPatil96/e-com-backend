import multer from "multer";

const uploadData = multer({ storage: multer.memoryStorage() });

export const upload = () => uploadData.any();
