package com.kitchenledger.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record ImportCommitRequest(@NotEmpty @Valid List<RecipeUpsertRequest> recipes) {
}
