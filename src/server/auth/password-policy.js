function _checkPasswordComplexity(password, fullName, username) {
  if (password.length < 8) {
    return { valid: false, message: "Password baru minimal harus 8 karakter." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password harus mengandung huruf besar." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password harus mengandung huruf kecil." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password harus mengandung angka." };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return {
      valid: false,
      message: "Password harus mengandung karakter khusus (simbol).",
    };
  }
  const lowerPass = password.toLowerCase();
  if (username && lowerPass.includes(username.toLowerCase())) {
    return {
      valid: false,
      message: "Password tidak boleh mengandung username Anda.",
    };
  }
  if (fullName) {
    const nameParts = fullName.split(" ").filter((part) => part.length > 2);
    for (let part of nameParts) {
      if (lowerPass.includes(part.toLowerCase())) {
        return {
          valid: false,
          message:
            "Password tidak boleh mengandung unsur nama Anda (" + part + ").",
        };
      }
    }
  }
  return { valid: true };
}
