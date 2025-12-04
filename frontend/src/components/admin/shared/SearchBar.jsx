/**
 * SearchBar Component
 *
 * Global search input for admin panel with debouncing.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.placeholder] - Input placeholder
 * @param {Function} [props.onSearch] - Search callback (debounced)
 */

import { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { TextField, InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

// Helper function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function SearchBar({ placeholder = "Search...", onSearch }) {
  const [value, setValue] = useState("");

  // Debounce search for 300ms
  const debouncedSearch = useMemo(
    () =>
      debounce((searchTerm) => {
        if (onSearch) {
          onSearch(searchTerm);
        }
      }, 300),
    [onSearch]
  );

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedSearch(newValue);
  };

  return (
    <TextField
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      size="small"
      sx={{ width: 300 }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
      }}
    />
  );
}

SearchBar.propTypes = {
  placeholder: PropTypes.string,
  onSearch: PropTypes.func,
};

export default SearchBar;
