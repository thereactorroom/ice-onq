/**
 * Returns the current URL search parameters as a query string (including the leading '?')
 * Use this to preserve URL parameters when navigating between pages.
 * 
 * Example:
 * const queryString = useQueryString();
 * <Link to={`/contacts${queryString}`}>Contacts</Link>
 */
export function useQueryString() {
  const params = new URLSearchParams(window.location.search);
  const search = params.toString();
  return search ? `?${search}` : '';
}