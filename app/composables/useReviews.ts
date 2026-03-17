import type { Database } from '~/types/supabase'

export interface Review {
  id: string
  session_id: string
  coach_id: string
  student_id: string
  rating: number
  comment: string | null
  created_at: string
  student?: {
    full_name: string | null
    avatar_url: string | null
  }
}

export const useReviews = () => {
  const client = useSupabaseClient<Database>()

  const getCoachReviews = async (coachId: string) => {
    const { data, error } = await client
      .from('reviews')
      .select(`
        *,
        student:profiles!student_id (
          full_name,
          avatar_url
        )
      `)
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Review[]
  }

  const getCoachAverageRating = async (coachId: string) => {
    const { data, error } = await client
      .rpc('get_coach_average_rating', { coach_uuid: coachId })

    if (error) throw error
    return data as number
  }

  const getCoachReviewCount = async (coachId: string) => {
    const { data, error } = await client
      .rpc('get_coach_review_count', { coach_uuid: coachId })

    if (error) throw error
    return data as number
  }

  const createReview = async (review: Omit<Review, 'id' | 'created_at' | 'student'>) => {
    const { data, error } = await client
      .from('reviews')
      .insert(review)
      .select()
      .single()

    if (error) throw error
    return data as Review
  }

  return {
    getCoachReviews,
    getCoachAverageRating,
    getCoachReviewCount,
    createReview
  }
}
