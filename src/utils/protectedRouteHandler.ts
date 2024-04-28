// Fetch stored flag from localStorage
export function getIncludeMembers(): boolean {
  const includeMembers =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('includeMembers') as string) || false : false
  return includeMembers
}