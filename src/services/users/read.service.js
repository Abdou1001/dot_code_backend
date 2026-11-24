import {supabase} from "../../config/supabase.js";
import ApiError from "../../utils/ApiError.js";
import {paginationResult} from "../../utils/pagination.js";

const selectedColumns = `user_id,full_name,email,role,date_of_birth,gender,phone_number,created_at,is_active`;

/** Retrieves paginated users with the existing filters and sorting. */
export const getUsersInfo = async (queryParams) => {
    const page = queryParams.page * 1 || 1;
    const limit = queryParams.limit * 1 || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const {keyword = "", role, gender, is_active, sort = "-created_at"} = queryParams;

    let query = supabase
        .from("user")
        .select(selectedColumns, {count: "exact"})
        .or(`full_name.ilike.%${keyword}%,email.ilike.%${keyword}%,phone_number.ilike.%${keyword}%`);

    if (role) query = query.eq("role", role);
    if (gender) query = query.eq("gender", gender);
    if (is_active) query = query.eq("is_active", is_active);

    query = query.order(sort.startsWith("-") ? sort.substring(1) : sort, {
        ascending: !sort.startsWith("-"),
    });

    const {data: users, error, count} = await query.range(from, to);

    if (error) {
        throw new ApiError("حدث خطأ أثناء جلب المستخدمين", 500);
    }

    return {
        message: "تم جلب البيانات بنجاح",
        pagination: paginationResult(page, limit, count),
        results: users,
    };
};

/** Retrieves one user by ID. */
export const getOneUserInfo = async (id) => {
    const {data: user, error} = await supabase
        .from("user")
        .select(selectedColumns)
        .eq("user_id", id)
        .single();

    if (!user || error) {
        throw new ApiError("المستخدم غير موجود", 404);
    }

    return user;
};

/** Retrieves the authenticated user's profile. */
export const getMyProfile = async (userId) => {
    const {data: user, error} = await supabase
        .from("user")
        .select(selectedColumns)
        .eq("user_id", userId)
        .single();

    if (!user || error) {
        throw new ApiError("المستخدم غير موجود", 404);
    }

    return user;
};
