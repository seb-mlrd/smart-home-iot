package com.smarthome.backend.device;

import com.smarthome.backend.device.dto.DeviceTypeResponse;
import com.smarthome.backend.domain.device.DeviceTypeRepository;
import com.smarthome.backend.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/device-types")
@RequiredArgsConstructor
public class DeviceTypeController {

    private final DeviceTypeRepository deviceTypeRepository;

    @GetMapping
    public ResponseEntity<List<DeviceTypeResponse>> getAll() {
        List<DeviceTypeResponse> types = deviceTypeRepository.findAll().stream()
                .map(t -> DeviceTypeResponse.builder()
                        .id(t.getId())
                        .name(t.getName())
                        .manufacturer(t.getManufacturer())
                        .protocol(t.getProtocol())
                        .capabilities(t.getCapabilities())
                        .icon(t.getIcon())
                        .build())
                .toList();
        return ResponseEntity.ok(types);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DeviceTypeResponse> getById(@PathVariable UUID id) {
        return deviceTypeRepository.findById(id)
                .map(t -> ResponseEntity.ok(DeviceTypeResponse.builder()
                        .id(t.getId())
                        .name(t.getName())
                        .manufacturer(t.getManufacturer())
                        .protocol(t.getProtocol())
                        .capabilities(t.getCapabilities())
                        .icon(t.getIcon())
                        .build()))
                .orElseThrow(() -> new ResourceNotFoundException("Device type not found: " + id));
    }
}
