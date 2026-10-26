package com.beautyshop.repository;
import com.beautyshop.model.*; import java.util.*; import org.springframework.data.mongodb.repository.MongoRepository;
public interface ShopStockRepository extends MongoRepository<ShopStock, String> { List<ShopStock> findByProductId(String id); Optional<ShopStock> findByShopIdAndProductId(String shop, String product); }
