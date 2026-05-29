import { useLocation } from "react-router-dom";

/**
 * Returns the current URL search parameters as a query string (including the leading '?')
 * Use this to preserve URL parameters when navigating between pages.
 * This hook updates when the URL changes.
 * 
 * Example:
 * const queryString = useQueryString();
 * <Link to={`/contacts${queryString}`}>Contacts</Link>
 */
export function useQueryString() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const search = params.toString();
  return search ? `?${search}` : '';
}