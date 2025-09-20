import { useQuery } from '@tanstack/vue-query'
import { http } from '@shared/api'

export function useHomeQuery() {
  return useQuery({
    queryKey: ['home'],
    queryFn: async () => {
      // demo endpoint
      const { data } = await http.get('https://jsonplaceholder.typicode.com/todos/1')
      return data
    },
  })
}
