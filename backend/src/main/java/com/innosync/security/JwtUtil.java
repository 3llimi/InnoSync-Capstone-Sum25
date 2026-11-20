package com.innosync.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;
import java.util.function.Function;

@Component
public class JwtUtil {
    private final Key secretKey = buildSigningKey();

    /**
     * Derives a stable signing key from JWT_SECRET so tokens stay valid across restarts
     * (free hosts sleep and restart the app often). Without JWT_SECRET (e.g. local dev),
     * falls back to a random per-process key.
     */
    private static Key buildSigningKey() {
        String secret = System.getenv("JWT_SECRET");
        if (secret == null || secret.isBlank()) {
            secret = System.getProperty("JWT_SECRET");
        }
        if (secret == null || secret.isBlank()) {
            return Keys.secretKeyFor(SignatureAlgorithm.HS256);
        }
        try {
            // SHA-256 gives exactly 32 bytes, which HS256 requires, for any secret length.
            byte[] keyBytes = MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8));
            return Keys.hmacShaKeyFor(keyBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
    private final long expirationMs = 10 * 24 * 60 * 60 * 1000;

    public String generateToken(String email) {
        long currentTimeMillis = System.currentTimeMillis();
        
        String subject = (email != null && email.isEmpty()) ? "<<EMPTY>>" : email;
        
        return Jwts.builder()
                .setSubject(subject)
                .setIssuedAt(new Date(currentTimeMillis))
                .setExpiration(new Date(currentTimeMillis + expirationMs))
                .claim("nonce", System.nanoTime())
                .signWith(secretKey)
                .compact();
    }

    public String extractUsername(String token) {
        String subject = extractClaim(token, Claims::getSubject);
        return "<<EMPTY>>".equals(subject) ? "" : subject;
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    public boolean validateToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return false;
        }
        try {
            Jwts.parserBuilder()
                    .setSigningKey(secretKey)
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(secretKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
