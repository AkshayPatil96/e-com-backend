import { redis } from "../../server";
import User from "../../model/user.model";

// get user by id
export const getUserService = async (id: string) => {
  const userJson = await redis.get(id);
  if (userJson) {
    const user = JSON.parse(userJson as string);
    delete user.password;
    return user;
  } else {
    const user = await User.findById(id);
    return user;
  }
};

// get all users
export const getAllUsersService = async (
  filter: any = { isDeleted: false },
  sort: any = { createdAt: -1 },
  populate?: any,
  select?: any,
  limit?: number,
  page?: number,
) => {
  if (page && limit) {
    const users = await User.find({ ...filter })
      .sort(sort)
      .populate(populate)
      .select(select)
      .limit(limit)
      .skip(limit * (page - 1));

    let total = await User.countDocuments(filter);

    return { users, total, itemsPerPage: limit, page };
  } else {
    const users = await User.find({ ...filter })
      .sort(sort)
      .populate(populate)
      .select(select);

    let total = await User.countDocuments(filter);
    return { users, total };
  }
};

// update user
export const updateUserService = async (filter: any, update: any) => {
  const user = await User.findOneAndUpdate(
    { ...filter },
    { ...update },
    { new: true },
  );
  let data = user?.toObject();
  if (data?._id) {
    let id = data?._id.toString();
    await redis.set(id, JSON.stringify(data), "EX", 7 * 24 * 60 * 60);
  }
  return { user, message: "User updated successfully", status: 200 };
};

// delete user
export const deleteUserSevice = async (id: string) => {
  const user = await User.findOne({ _id: id, isDeleted: true });
  if (!user) return { message: "User not found", status: 404 };
  
  await user.deleteOne();
  await redis.del(user?._id?.toString());

  return { message: "User deleted successfully", status: 200 };
};
