/**
 * ThemeToggle Component
 *
 * Toggles between light and dark mode.
 *
 * @component
 */

import { IconButton } from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { useUIStore } from "../../../stores/uiStore";

function ThemeToggle() {
  const darkMode = useUIStore((state) => state.darkMode);
  const toggleDarkMode = useUIStore((state) => state.toggleDarkMode);

  return (
    <IconButton color="inherit" onClick={toggleDarkMode}>
      {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
    </IconButton>
  );
}

export default ThemeToggle;
