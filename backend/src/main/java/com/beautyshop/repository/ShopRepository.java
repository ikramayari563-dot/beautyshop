package com.beautyshop.repository;
import com.beautyshop.model.*; import java.util.*; import org.springframework.data.mongodb.repository.MongoRepository;
public interface ShopRepository extends MongoRepository<Shop, String> {}
