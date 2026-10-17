package br.com.dietafacil.auth;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.dao.OptimisticLockingFailureException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<?> authentication(AuthenticationException exception) {
        return ResponseEntity.status(401).body(Map.of("code", "INVALID_CREDENTIALS", "message", "E-mail ou senha inválidos."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<?> conflict(DataIntegrityViolationException exception) {
        return ResponseEntity.status(409).body(Map.of("code", "CONFLICT", "message", "Os dados entram em conflito com um registro existente. Confira os dados ou tente entrar na sua conta."));
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    ResponseEntity<?> concurrentUpdate(OptimisticLockingFailureException exception) {
        return ResponseEntity.status(409).body(Map.of("code", "VERSION_CONFLICT", "message", "O registro foi alterado em outra sessão. Recarregue antes de editar."));
    }

    @ExceptionHandler({ConstraintViolationException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<?> invalidParameter(Exception exception) {
        return ResponseEntity.badRequest().body(Map.of("code", "INVALID_PARAMETER", "message", "Confira os filtros e parâmetros informados."));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validation(MethodArgumentNotValidException exception) {
        var fields = new LinkedHashMap<String, String>();
        exception.getBindingResult().getFieldErrors().forEach(error -> fields.putIfAbsent(error.getField(), "Confira este campo."));
        return ResponseEntity.badRequest().body(Map.of("code", "VALIDATION_ERROR", "message", "Confira os campos informados.", "fields", fields));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<?> unreadable(HttpMessageNotReadableException exception) {
        return ResponseEntity.badRequest().body(Map.of("code", "INVALID_REQUEST", "message", "Dados inválidos na solicitação."));
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> status(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode()).body(Map.of("code", "INVALID_REQUEST", "message",
            exception.getReason() == null ? "Solicitação inválida." : exception.getReason()));
    }
}
